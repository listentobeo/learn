import { Search } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { demoStudents } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";

type StudentRow = typeof demoStudents[number];

async function getStudents(): Promise<StudentRow[]> {
  const supabase = await createClient();
  if (!supabase) return demoStudents;
  const { data: profiles } = await supabase.from("profiles").select("id,name,email,track").eq("role", "student").order("name");
  if (!profiles?.length) return [];
  return Promise.all(profiles.map(async (profile) => {
    const [{ data: quiz }, { data: assignment }] = await Promise.all([
      supabase.from("quiz_submissions").select("lesson_code,score").eq("student_id", profile.id).order("submitted_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("assignments").select("reviewed").eq("student_id", profile.id).order("submitted_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      track: profile.track,
      lesson: quiz?.lesson_code || "Not started",
      score: typeof quiz?.score === "number" ? `${quiz.score}/3` : "—",
      status: assignment ? (assignment.reviewed ? "Reviewed" : "Awaiting review") : "No submission",
    };
  }));
}

export default async function AdminPage() {
  const students = await getStudents();
  const awaiting = students.filter((student) => student.status === "Awaiting review").length;
  const reviewed = students.filter((student) => student.status === "Reviewed").length;
  return (
    <AppShell admin name="Benjamin Odeke" track="">
      <div className="dash-head">
        <div><span className="subtle">School overview</span><h1>Student room.</h1></div>
        <span className="pill">● Admin access</span>
      </div>
      <section className="admin-stats">
        <div className="stat"><span>Active students</span><strong>{students.length}</strong></div>
        <div className="stat"><span>Awaiting review</span><strong>{awaiting}</strong></div>
        <div className="stat"><span>Avg. quiz score</span><strong>86%</strong></div>
        <div className="stat"><span>Calls complete</span><strong>{reviewed}</strong></div>
      </section>
      <div className="content-title"><h2>Enrolled students</h2><div style={{ color: "#8d95a2" }}><Search size={17} /></div></div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Student</th><th>Track</th><th>Current lesson</th><th>Last quiz</th><th>Assignment</th></tr></thead>
          <tbody>
            {students.map((student) => <tr key={student.id}><td><Link href={`/admin/student/${student.id}`}><strong>{student.name}</strong><br /><span className="subtle">{student.email}</span></Link></td><td>{student.track}</td><td>{student.lesson}</td><td>{student.score}</td><td><span className="status-dot" style={{ background: student.status === "No submission" ? "#687180" : undefined }} />{student.status}</td></tr>)}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
