import { demoStudents } from "./demo-data";
import { createClient } from "./supabase/server";
import type { Track } from "./types";

export type StudentRecord = {
  id: string;
  name: string;
  email: string;
  track: string;
  currentLesson: string;
  lastQuizScore: string;
  assignmentStatus: "Awaiting review" | "Reviewed" | "No submission";
};

export type AdminDashboardData = {
  students: StudentRecord[];
  activeStudents: number;
  awaitingReview: number;
  completedReviews: number;
  averageQuizScore: number | null;
  demo: boolean;
};

const trackCodes: Record<Track, string[]> = {
  Discovery: ["D1", "D2", "D3", "D4", "D5", "D6", "D7"],
  Drawing: ["DR1", "DR2", "DR3", "DR4", "DR5", "DR6", "DR7", "DR8", "DR9", "DR10", "DR11", "DR12"],
  Painting: ["P1", "P2", "P3", "P3.5", "P4", "P5", "P6", "P7", "P8", "P9", "P10", "P11", "P12"],
};

function currentLesson(track: Track, enrollmentDate: string | null, paymentStatus: string, completed: Set<string>) {
  if (paymentStatus !== "active" || !enrollmentDate) return "Not enrolled";
  const codes = trackCodes[track];
  const elapsedWeeks = Math.max(0, Math.floor((Date.now() - new Date(enrollmentDate).getTime()) / (7 * 86400000)));
  const unlockedCount = track === "Discovery" ? codes.length : Math.min(codes.length, elapsedWeeks + 1);
  const unlocked = codes.slice(0, unlockedCount);
  return unlocked.find((code) => !completed.has(code)) || `${unlocked.at(-1) || codes[0]} complete`;
}

function demoData(): AdminDashboardData {
  const students: StudentRecord[] = demoStudents.map((student) => ({
    id: student.id,
    name: student.name,
    email: student.email,
    track: student.track,
    currentLesson: student.lesson,
    lastQuizScore: student.score,
    assignmentStatus: student.status as StudentRecord["assignmentStatus"],
  }));
  const scores = students.map((student) => Number(student.lastQuizScore.split("/")[0])).filter(Number.isFinite);
  return {
    students,
    activeStudents: students.length,
    awaitingReview: students.filter((student) => student.assignmentStatus === "Awaiting review").length,
    completedReviews: students.filter((student) => student.assignmentStatus === "Reviewed").length,
    averageQuizScore: scores.length ? Math.round((scores.reduce((sum, score) => sum + score, 0) / (scores.length * 3)) * 100) : null,
    demo: true,
  };
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const supabase = await createClient();
  if (!supabase) return demoData();

  const [{ data: profiles }, { data: enrollments }, { data: quizzes }, { data: assignments }] = await Promise.all([
    supabase.from("profiles").select("id,name,email,track,enrollment_date,payment_status").eq("role", "student").order("name"),
    supabase.from("enrollments").select("student_id,track,enrollment_date,payment_status").eq("payment_status", "active"),
    supabase.from("quiz_submissions").select("student_id,lesson_code,score,submitted_at").order("submitted_at", { ascending: false }),
    supabase.from("assignments").select("student_id,reviewed,submitted_at").order("submitted_at", { ascending: false }),
  ]);

  const latestQuizByStudent = new Map<string, { lesson_code: string; score: number }>();
  const latestAssignmentByStudent = new Map<string, { reviewed: boolean }>();
  const completedByStudent = new Map<string, Set<string>>();
  const latestAttemptByStudentLesson = new Map<string, number>();

  for (const quiz of quizzes || []) {
    if (!latestQuizByStudent.has(quiz.student_id)) latestQuizByStudent.set(quiz.student_id, quiz);
    const completed = completedByStudent.get(quiz.student_id) || new Set<string>();
    completed.add(quiz.lesson_code);
    completedByStudent.set(quiz.student_id, completed);
    const attemptKey = `${quiz.student_id}:${quiz.lesson_code}`;
    if (!latestAttemptByStudentLesson.has(attemptKey)) latestAttemptByStudentLesson.set(attemptKey, quiz.score);
  }
  for (const assignment of assignments || []) {
    if (!latestAssignmentByStudent.has(assignment.student_id)) latestAssignmentByStudent.set(assignment.student_id, assignment);
  }

  const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));
  const activeEnrollmentByStudent = new Map<string, { track: Track; enrollment_date: string; payment_status: string }>();
  for (const enrollment of enrollments || []) {
    const primaryTrack = profileById.get(enrollment.student_id)?.track;
    if (!activeEnrollmentByStudent.has(enrollment.student_id) || enrollment.track === primaryTrack) {
      activeEnrollmentByStudent.set(
        enrollment.student_id,
        enrollment as { track: Track; enrollment_date: string; payment_status: string },
      );
    }
  }

  const students: StudentRecord[] = (profiles || []).map((profile) => {
    const quiz = latestQuizByStudent.get(profile.id);
    const assignment = latestAssignmentByStudent.get(profile.id);
    const enrollment = activeEnrollmentByStudent.get(profile.id);
    const track = (enrollment?.track || profile.track) as Track;
    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      track,
      currentLesson: currentLesson(
        track,
        enrollment?.enrollment_date || profile.enrollment_date,
        enrollment?.payment_status || profile.payment_status,
        completedByStudent.get(profile.id) || new Set(),
      ),
      lastQuizScore: quiz ? `${quiz.score}/3` : "—",
      assignmentStatus: assignment ? (assignment.reviewed ? "Reviewed" : "Awaiting review") : "No submission",
    };
  });

  const latestScores = [...latestAttemptByStudentLesson.values()];
  const studentProfileIds = new Set((profiles || []).map((profile) => profile.id));
  const activeStudentIds = new Set(
    (enrollments || [])
      .filter((enrollment) => studentProfileIds.has(enrollment.student_id))
      .map((enrollment) => enrollment.student_id),
  );
  for (const profile of profiles || []) {
    if (profile.payment_status === "active") activeStudentIds.add(profile.id);
  }
  return {
    students,
    activeStudents: activeStudentIds.size,
    awaitingReview: (assignments || []).filter((assignment) => !assignment.reviewed).length,
    completedReviews: (assignments || []).filter((assignment) => assignment.reviewed).length,
    averageQuizScore: latestScores.length ? Math.round((latestScores.reduce((sum, score) => sum + score, 0) / (latestScores.length * 3)) * 100) : null,
    demo: false,
  };
}
