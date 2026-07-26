import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CertificateEmailRetryButton } from "@/components/certificate-email-retry-button";
import { NotificationRetryButton } from "@/components/notification-retry-button";
import { RunCompletionChecksButton } from "@/components/run-completion-checks-button";
import { createClient } from "@/lib/supabase/server";
import type { Track } from "@/lib/types";

type NotificationRow = { id: string; kind: string; channel: string; recipient: string; status: string; attempts: number; scheduled_for: string; last_error: string | null };
type AuditIssue = { track: string; lesson_code: string; issue: string; detail: string };

export const dynamic = "force-dynamic";

export default async function AdminAutomationsPage() {
  const supabase = await createClient();
  const live = Boolean(supabase);
  let notifications: NotificationRow[] = [];
  let auditIssues: AuditIssue[] = [];
  let failedCertificates: Array<{ id: string; student_id: string; track: Track; certificate_code: string; email_error: string | null }> = [];
  let pendingChecks = 0;
  if (supabase) {
    const [{ data: jobs }, { data: issues }, { data: certificateRows }, { count }] = await Promise.all([
      supabase.from("notification_jobs").select("id,kind,channel,recipient,status,attempts,scheduled_for,last_error").order("created_at", { ascending: false }).limit(50),
      supabase.from("curriculum_audit_issues").select("track,lesson_code,issue,detail").order("track").order("lesson_code"),
      supabase.from("certificates").select("id,student_id,track,certificate_code,email_error").eq("email_status", "failed").order("issued_at", { ascending: false }),
      supabase.from("completion_checks").select("id", { count: "exact", head: true }).is("processed_at", null),
    ]);
    notifications = (jobs || []) as NotificationRow[];
    auditIssues = (issues || []) as AuditIssue[];
    failedCertificates = (certificateRows || []) as typeof failedCertificates;
    pendingChecks = count || 0;
  }
  const failed = notifications.filter((item) => item.status === "failed").length;
  const sent = notifications.filter((item) => item.status === "sent").length;
  return (
    <AppShell admin name="Benjamin Odeke" track="">
      <div className="dash-head"><div><span className="subtle">Curriculum, certificates and messages</span><h1>School automation.</h1></div><span className="pill">{!live ? "Sample mode" : failed ? `${failed} need attention` : "● Systems clear"}</span></div>
      <div className="automation-section-head">
        <p className="subtle">Queued checks run automatically; use this control to process them immediately.</p>
        <RunCompletionChecksButton />
      </div>
      <section className="admin-stats">
        <div className="stat"><span>Curriculum issues</span><strong>{auditIssues.length}</strong></div>
        <div className="stat"><span>Completion checks</span><strong>{pendingChecks}</strong></div>
        <div className="stat"><span>Messages sent</span><strong>{sent}</strong></div>
        <div className="stat"><span>Failed messages</span><strong>{failed}</strong></div>
      </section>
      <section className="surface">
        <div className="automation-section-head"><div><h2>Curriculum readiness</h2><p className="subtle">All required lesson content, questions, explanations, videos, and assignment channels.</p></div>{auditIssues.length ? <AlertTriangle color="#d49b70" /> : <CheckCircle2 color="var(--success)" />}</div>
        {!live ? <p className="subtle">Connect Supabase to run the live curriculum audit.</p> : auditIssues.length ? <div className="audit-list">{auditIssues.map((issue) => <div className="integration-row" key={`${issue.lesson_code}-${issue.issue}`}><strong className="missing">{issue.lesson_code}</strong><span>{issue.detail}</span><code>{issue.issue}</code></div>)}</div> : <div className="automation-ready"><CheckCircle2 size={18} /> Curriculum audit passed for all 32 required lessons.</div>}
      </section>
      <div className="content-title"><h2>Recent notification jobs</h2><span>Automatic retries stop after four attempts</span></div>
      <div className="surface notification-log">
        {notifications.length ? notifications.map((job) => (
          <div className="notification-row" key={job.id}>
            <span className={`notification-state ${job.status}`}>{job.status === "sent" ? <CheckCircle2 size={15} /> : job.status === "failed" ? <AlertTriangle size={15} /> : <Clock3 size={15} />}{job.status}</span>
            <div><strong>{job.kind.replaceAll("_", " ")}</strong><span>{job.channel} · {job.recipient}</span>{job.last_error && <small>{job.last_error}</small>}</div>
            <time>{new Date(job.scheduled_for).toLocaleString("en-NG", { dateStyle: "short", timeStyle: "short" })}</time>
            {job.status === "failed" && <NotificationRetryButton id={job.id} />}
          </div>
        )) : <p className="subtle">No notification jobs have been created yet.</p>}
      </div>
      {failedCertificates.length > 0 && (
        <>
          <div className="content-title"><h2>Certificate emails needing attention</h2><span>The PDF is already safe in the student dashboard</span></div>
          <div className="surface">{failedCertificates.map((certificate) => <div className="notification-row" key={certificate.id}><span className="notification-state failed"><AlertTriangle size={15} /> Failed</span><div><strong>{certificate.track} · {certificate.certificate_code}</strong><small>{certificate.email_error || "Delivery failed"}</small></div><span /><CertificateEmailRetryButton studentId={certificate.student_id} track={certificate.track} /></div>)}</div>
        </>
      )}
    </AppShell>
  );
}
