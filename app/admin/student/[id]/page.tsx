import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ReviewButton } from "@/components/review-button";
import { createClient } from "@/lib/supabase/server";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) {
    return (
      <AppShell admin name="Benjamin Odeke" track="">
        <Link className="back-link" href="/admin"><ArrowLeft size={15} /> Back to students</Link>
        <div className="dash-head"><div><span className="subtle">Drawing student</span><h1>Amara Okafor.</h1></div></div>
        <div className="lesson-grid"><section className="surface"><h2>Quiz history</h2><div className="question"><strong>DR3 · Shape and Structure</strong><p className="subtle">Score 3/3 · Submitted 18 Jul 2026</p></div><div className="question"><strong>DR2 · Line, Gesture & Rhythm</strong><p className="subtle">Score 2/3 · Submitted 11 Jul 2026</p></div></section><aside className="surface"><h2>Latest assignment</h2><div className="dropzone" style={{ cursor: "default" }}>Student artwork preview<br /><span className="subtle">Private Supabase image</span></div><ReviewButton assignmentId="demo" reviewed={false} /></aside></div>
      </AppShell>
    );
  }
  const [{ data: profile }, { data: quizzes }, { data: assignments }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase.from("quiz_submissions").select("*").eq("student_id", id).order("submitted_at", { ascending: false }),
    supabase.from("assignments").select("*").eq("student_id", id).order("submitted_at", { ascending: false }),
  ]);
  if (!profile) notFound();
  return (
    <AppShell admin name="Benjamin Odeke" track="">
      <Link className="back-link" href="/admin"><ArrowLeft size={15} /> Back to students</Link>
      <div className="dash-head"><div><span className="subtle">{profile.track} student</span><h1>{profile.name}.</h1></div></div>
      <div className="lesson-grid">
        <section className="surface"><h2>Quiz history</h2>{quizzes?.length ? quizzes.map((quiz) => <div className="question" key={quiz.id}><strong>{quiz.lesson_code}</strong><p className="subtle">Score {quiz.score}/3 · {new Date(quiz.submitted_at).toLocaleDateString("en-NG")}</p></div>) : <p className="subtle">No quizzes submitted yet.</p>}</section>
        <aside className="surface"><h2>Assignments</h2>{assignments?.length ? assignments.map((assignment) => <div className="question" key={assignment.id}><strong>{assignment.lesson_code}</strong><p><a className="gold-link" href={assignment.file_url} target="_blank" rel="noreferrer">View submitted work <ExternalLink size={13} /></a></p><ReviewButton assignmentId={assignment.id} reviewed={assignment.reviewed} /></div>) : <p className="subtle">No assignments submitted yet.</p>}</aside>
      </div>
    </AppShell>
  );
}
