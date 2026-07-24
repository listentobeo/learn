import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StudentRecordsTable } from "@/components/student-records-table";
import { getAdminDashboardData } from "@/lib/admin-data";

export default async function AdminPage() {
  const data = await getAdminDashboardData();
  const attention = data.students.filter((student) => student.assignmentStatus === "Awaiting review");
  return (
    <AppShell admin name="Benjamin Odeke" track="">
      <div className="dash-head">
        <div><span className="subtle">School overview</span><h1>Student room.</h1></div>
        <span className="pill">{data.demo ? "Sample data" : "● Live data"}</span>
      </div>
      <section className="admin-stats">
        <div className="stat"><span>Active students</span><strong>{data.activeStudents}</strong></div>
        <div className="stat"><span>Awaiting review</span><strong>{data.awaitingReview}</strong></div>
        <div className="stat"><span>Average latest score</span><strong>{data.averageQuizScore === null ? "—" : `${data.averageQuizScore}%`}</strong></div>
        <div className="stat"><span>Reviews complete</span><strong>{data.completedReviews}</strong></div>
      </section>
      <div className="content-title"><h2>Needs your attention</h2><Link className="gold-link inline-link" href="/admin/students">All student records <ArrowRight size={14} /></Link></div>
      <StudentRecordsTable students={attention} limit={5} />
    </AppShell>
  );
}
