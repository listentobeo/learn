import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AssignmentReviewPanel } from "@/components/assignment-review-panel";
import { createClient } from "@/lib/supabase/server";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) {
    return (
      <AppShell admin name="Benjamin Odeke" track="">
        <Link className="back-link" href="/admin/students"><ArrowLeft size={15} /> Back to students</Link>
        <div className="dash-head"><div><span className="subtle">Drawing student</span><h1>Amara Okafor.</h1></div></div>
        <div className="lesson-grid"><section className="surface"><h2>Quiz history</h2><div className="question"><strong>DR3 · Shape and Structure</strong><p className="subtle">Score 3/3 · Submitted 18 Jul 2026</p></div><div className="question"><strong>DR2 · Line, Gesture & Rhythm</strong><p className="subtle">Score 2/3 · Submitted 11 Jul 2026</p></div></section><aside className="surface"><h2>Latest assignment</h2><AssignmentReviewPanel assignmentId="demo" lessonCode="DR3" viewUrl={null} initialSeenAt={null} initialReviewed={false} initialFeedback="" /></aside></div>
      </AppShell>
    );
  }
  const [{ data: profile }, { data: quizzes }, { data: assignments }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase.from("quiz_submissions").select("*").eq("student_id", id).order("submitted_at", { ascending: false }),
    supabase.from("assignments").select("*").eq("student_id", id).order("submitted_at", { ascending: false }),
  ]);
  if (!profile) notFound();
  const assignmentsWithLinks = await Promise.all((assignments || []).map(async (assignment) => {
    const { data } = await supabase.storage.from("assignments").createSignedUrl(assignment.file_path, 60 * 60);
    return { ...assignment, viewUrl: data?.signedUrl || null };
  }));
  return (
    <AppShell admin name="Benjamin Odeke" track="">
      <Link className="back-link" href="/admin/students"><ArrowLeft size={15} /> Back to students</Link>
      <div className="dash-head"><div><span className="subtle">{profile.track} student</span><h1>{profile.name}.</h1></div></div>
      <div className="lesson-grid">
        <section className="surface"><h2>Quiz history</h2>{quizzes?.length ? quizzes.map((quiz) => <div className="question" key={quiz.id}><strong>{quiz.lesson_code} · Attempt {quiz.attempt_number || 1}</strong><p className="subtle">Score {quiz.score}/3 · {new Date(quiz.submitted_at).toLocaleDateString("en-NG")}</p></div>) : <p className="subtle">No quizzes submitted yet.</p>}</section>
        <aside className="surface"><h2>Assignments</h2>{assignmentsWithLinks.length ? assignmentsWithLinks.map((assignment) => <AssignmentReviewPanel key={assignment.id} assignmentId={assignment.id} lessonCode={assignment.lesson_code} viewUrl={assignment.viewUrl} initialSeenAt={assignment.seen_at} initialReviewed={assignment.reviewed} initialFeedback={assignment.feedback} />) : <p className="subtle">No assignments submitted yet.</p>}</aside>
      </div>
    </AppShell>
  );
}
