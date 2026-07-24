import Link from "next/link";
import type { StudentRecord } from "@/lib/admin-data";

export function StudentRecordsTable({ students, limit }: { students: StudentRecord[]; limit?: number }) {
  const visible = typeof limit === "number" ? students.slice(0, limit) : students;
  if (!visible.length) return <div className="empty-state"><strong>No students need attention</strong><span>New submissions and enrolled students will appear here automatically.</span></div>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr><th>Student</th><th>Track</th><th>Current lesson</th><th>Last quiz</th><th>Latest assignment</th></tr></thead>
        <tbody>
          {visible.map((student) => (
            <tr key={student.id}>
              <td><Link href={`/admin/student/${student.id}`}><strong>{student.name}</strong><br /><span className="subtle">{student.email}</span></Link></td>
              <td>{student.track}</td>
              <td>{student.currentLesson}</td>
              <td>{student.lastQuizScore}</td>
              <td><span className="status-dot" style={{ background: student.assignmentStatus === "No submission" ? "#687180" : undefined }} />{student.assignmentStatus}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
