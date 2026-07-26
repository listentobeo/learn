import { AppShell } from "@/components/app-shell";
import { StudentRecordsTable } from "@/components/student-records-table";
import { getAdminDashboardData } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export default async function AdminStudentsPage() {
  const data = await getAdminDashboardData();
  return (
    <AppShell admin name="Benjamin Odeke" track="">
      <div className="dash-head">
        <div><span className="subtle">Progress, quizzes and submissions</span><h1>Student records.</h1></div>
        <span className="pill">{data.students.length} students</span>
      </div>
      <StudentRecordsTable students={data.students} />
    </AppShell>
  );
}
