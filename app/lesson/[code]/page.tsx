import { ArrowLeft, PlayCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LessonWork } from "@/components/lesson-work";
import { demoProfile, demoQuestions, lessonsFor } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import type { AssignmentRecord, Lesson, Profile, QuizQuestion } from "@/lib/types";
import { isLessonUnlocked } from "@/lib/utils";
import { getYouTubeVideo } from "@/lib/youtube";

async function lessonData(code: string): Promise<{ profile: Profile; lesson: Lesson; questions: QuizQuestion[]; assignment: AssignmentRecord | null; quizCompleted: boolean } | null> {
  const supabase = await createClient();
  if (!supabase) {
    const lesson = lessonsFor(demoProfile.track).find((item) => item.lesson_code === code);
    return lesson ? { profile: demoProfile, lesson, questions: demoQuestions(code), assignment: null, quizCompleted: false } : null;
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: profile }, { data: lesson }, { data: questions }, { data: assignment }, { count: quizAttempts }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("lessons").select("*").eq("lesson_code", code).single(),
    supabase.from("quiz_questions").select("id,lesson_code,question_text,option_a,option_b,option_c,option_d").eq("lesson_code", code).order("question_order"),
    supabase.from("assignments").select("id,lesson_code,submitted_at,seen_at,reviewed,reviewed_at,feedback,feedback_at").eq("student_id", user.id).eq("lesson_code", code).maybeSingle(),
    supabase.from("quiz_submissions").select("id", { count: "exact", head: true }).eq("student_id", user.id).eq("lesson_code", code),
  ]);
  if (!profile || !lesson) return null;
  const { data: enrollment } = await supabase.from("enrollments").select("enrollment_date,payment_status").eq("student_id", user.id).eq("track", lesson.track).eq("payment_status", "active").maybeSingle();
  if (!enrollment) return null;
  const activeProfile = { ...profile, track: lesson.track, enrollment_date: enrollment.enrollment_date, payment_status: enrollment.payment_status } as Profile;
  return { profile: activeProfile, lesson: lesson as Lesson, questions: (questions || []) as QuizQuestion[], assignment: assignment as AssignmentRecord | null, quizCompleted: Boolean(quizAttempts) };
}

export default async function LessonPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const data = await lessonData(code);
  if (!data) notFound();
  if (!isLessonUnlocked(data.lesson, data.profile)) notFound();
  const { profile, lesson, questions, assignment, quizCompleted } = data;
  const video = await getYouTubeVideo(lesson.youtube_video_id);
  return (
    <AppShell name={profile.name} track={profile.track}>
      <div className="lesson-shell">
        <Link className="back-link" href={`/dashboard?track=${lesson.track}`}><ArrowLeft size={15} /> Back to lessons</Link>
        <div className="lesson-heading"><div><span className="lesson-code">{lesson.lesson_code} · Week {lesson.week_number}</span><h1>{lesson.title}</h1></div><span className="pill">Lesson available</span></div>
        <div className="video">
          {video ? <iframe src={`https://www.youtube-nocookie.com/embed/${video.id}`} title={video.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : <div className="video-placeholder"><div><PlayCircle size={44} /><strong>Lesson video</strong><br /><span>Connect a YouTube video ID in Supabase to play this lesson.</span></div></div>}
        </div>
        <LessonWork
          questions={questions.length ? questions : demoQuestions(code)}
          lessonCode={code}
          notes={lesson.notes}
          instructions={lesson.assignment_instructions}
          initialAssignment={assignment}
          initialQuizCompleted={quizCompleted}
        />
      </div>
    </AppShell>
  );
}
