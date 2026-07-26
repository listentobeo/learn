import { CheckCircle2, CircleDashed, Clock3 } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { CertificateCard } from "@/components/certificate-card";
import { demoProfile, lessonsFor } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import type { Certificate, Enrollment, Lesson, Profile, Track } from "@/lib/types";

type QuizRow = { lesson_code: string; score: number; attempt_number: number; submitted_at: string };
type AssignmentRow = { lesson_code: string; submitted_at: string; seen_at: string | null; reviewed: boolean; reviewed_at: string | null; feedback: string | null };

export default async function ProgressPage({ searchParams }: { searchParams: Promise<{ track?: string }> }) {
  const { track: requestedTrack } = await searchParams;
  const supabase = await createClient();
  let profile = demoProfile as Profile;
  let enrollments: Enrollment[] = [{ student_id: profile.id, track: profile.track, enrollment_date: profile.enrollment_date!, payment_status: "active" }];
  let lessons = lessonsFor(profile.track);
  let quizzes: QuizRow[] = [];
  let assignments: AssignmentRow[] = [];
  let certificate: Certificate | null = null;

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const [{ data: profileRow }, { data: enrollmentRows }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("enrollments").select("student_id,track,enrollment_date,payment_status").eq("student_id", user.id).eq("payment_status", "active").order("enrollment_date"),
      ]);
      if (profileRow) profile = profileRow as Profile;
      enrollments = (enrollmentRows || []) as Enrollment[];
      const allowedTrack = ["Drawing", "Painting", "Discovery"].includes(requestedTrack || "") ? requestedTrack as Track : null;
      const selected = enrollments.find((item) => item.track === allowedTrack) || enrollments.find((item) => item.track === profile.track) || enrollments[0];
      if (selected) profile = { ...profile, track: selected.track, enrollment_date: selected.enrollment_date, payment_status: selected.payment_status };
      const [{ data: lessonRows }, { data: quizRows }, { data: assignmentRows }, { data: certificateRow }] = await Promise.all([
        supabase.from("lessons").select("*").eq("track", profile.track).order("week_number"),
        supabase.from("quiz_submissions").select("lesson_code,score,attempt_number,submitted_at").eq("student_id", user.id).order("submitted_at", { ascending: false }),
        supabase.from("assignments").select("lesson_code,submitted_at,seen_at,reviewed,reviewed_at,feedback").eq("student_id", user.id).order("submitted_at", { ascending: false }),
        supabase.from("certificates").select("id,student_id,track,file_url,certificate_code,issued_at").eq("student_id", user.id).eq("track", profile.track).maybeSingle(),
      ]);
      lessons = (lessonRows || []) as Lesson[];
      quizzes = (quizRows || []) as QuizRow[];
      assignments = (assignmentRows || []) as AssignmentRow[];
      certificate = certificateRow as Certificate | null;
    }
  }

  const latestQuiz = new Map<string, QuizRow>();
  for (const quiz of quizzes) if (!latestQuiz.has(quiz.lesson_code)) latestQuiz.set(quiz.lesson_code, quiz);
  const assignmentByLesson = new Map(assignments.map((assignment) => [assignment.lesson_code, assignment]));
  const completedLessons = lessons.filter((lesson) => latestQuiz.has(lesson.lesson_code) && assignmentByLesson.get(lesson.lesson_code)?.reviewed).length;
  const quizCount = lessons.filter((lesson) => latestQuiz.has(lesson.lesson_code)).length;
  const reviewedCount = lessons.filter((lesson) => assignmentByLesson.get(lesson.lesson_code)?.reviewed).length;
  const percentage = lessons.length ? Math.round((completedLessons / lessons.length) * 100) : 0;

  return (
    <AppShell name={profile.name} track={profile.track}>
      <div className="dash-head"><div><span className="subtle">Student and parent summary</span><h1>Progress.</h1></div><span className="pill">{percentage}% complete</span></div>
      {enrollments.length > 1 && <nav className="course-switcher" aria-label="Progress by course">{enrollments.map((enrollment) => <Link className={enrollment.track === profile.track ? "active" : ""} href={`/progress?track=${enrollment.track}`} key={enrollment.track}>{enrollment.track}</Link>)}</nav>}
      {certificate && <CertificateCard certificate={certificate} />}
      <section className="admin-stats progress-stats">
        <div className="stat"><span>Required lessons</span><strong>{lessons.length}</strong></div>
        <div className="stat"><span>Knowledge checks</span><strong>{quizCount}/{lessons.length}</strong></div>
        <div className="stat"><span>Reviews complete</span><strong>{reviewedCount}/{lessons.length}</strong></div>
        <div className="stat"><span>Track completion</span><strong>{percentage}%</strong></div>
      </section>
      <section className="settings-note parent-summary">
        <strong>For the student and parent or guardian</strong>
        <p>{completedLessons === lessons.length && lessons.length ? `${profile.name} has completed every requirement in the ${profile.track} Track.` : `${profile.name} has fully completed ${completedLessons} of ${lessons.length} lessons in the ${profile.track} Track. A lesson is complete after its quiz is submitted and Benjamin finishes the assignment review.`}</p>
      </section>
      <div className="content-title"><h2>Lesson record</h2><span>Latest quiz attempt shown</span></div>
      <div className="progress-records">
        {lessons.map((lesson) => {
          const quiz = latestQuiz.get(lesson.lesson_code);
          const assignment = assignmentByLesson.get(lesson.lesson_code);
          const complete = Boolean(quiz && assignment?.reviewed);
          return (
            <article className="surface progress-record" key={lesson.lesson_code}>
              <div className="progress-record-head">{complete ? <CheckCircle2 size={19} /> : assignment ? <Clock3 size={19} /> : <CircleDashed size={19} />}<div><span className="lesson-code">{lesson.lesson_code}</span><h2>{lesson.title}</h2></div><strong className={complete ? "complete" : ""}>{complete ? "Complete" : "In progress"}</strong></div>
              <div className="progress-detail-grid">
                <div><span>Latest quiz</span><strong>{quiz ? `${quiz.score}/3 · Attempt ${quiz.attempt_number}` : "Not submitted"}</strong></div>
                <div><span>Assignment</span><strong>{assignment?.reviewed ? "Review complete" : assignment?.seen_at ? "Seen by Benjamin" : assignment ? "Awaiting review" : "Not submitted"}</strong></div>
              </div>
              {assignment?.feedback && <div className="feedback-box"><span>Benjamin’s feedback</span><p>{assignment.feedback}</p></div>}
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
