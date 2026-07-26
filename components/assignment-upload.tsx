"use client";

import { CheckCircle2, Clock3, Eye, ImagePlus, MessageCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { AssignmentRecord } from "@/lib/types";

export function AssignmentUpload({
  lessonCode,
  instructions,
  initialAssignment,
  whatsappNumber,
  studentName,
  quizCompleted,
}: {
  lessonCode: string;
  instructions: string;
  initialAssignment: AssignmentRecord | null;
  whatsappNumber?: string;
  studentName: string;
  quizCompleted: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [assignment, setAssignment] = useState<AssignmentRecord | null>(initialAssignment);
  const [loading, setLoading] = useState(false);
  const whatsappUrl = useMemo(() => {
    const number = whatsappNumber?.replace(/\D/g, "");
    if (!number) return null;
    const message = `Hello Benjamin, I am ${studentName}. I submitted ${lessonCode} and would like to schedule my review call.`;
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }, [lessonCode, studentName, whatsappNumber]);

  useEffect(() => {
    if (!assignment || assignment.reviewed) return;
    const refresh = async () => {
      const response = await fetch(`/api/assignments?lessonCode=${encodeURIComponent(lessonCode)}`, { cache: "no-store" });
      if (!response.ok) return;
      const result = await response.json();
      if (result.assignment) setAssignment(result.assignment);
    };
    const timer = window.setInterval(refresh, 30000);
    return () => window.clearInterval(timer);
  }, [assignment, lessonCode]);

  async function submit() {
    if (!file) return toast.error("Choose a photo of your work first.");
    setLoading(true);
    const body = new FormData();
    body.append("file", file);
    body.append("lessonCode", lessonCode);
    const response = await fetch("/api/assignments", { method: "POST", body });
    const result = await response.json();
    if (!response.ok) {
      toast.error(result.error || "Upload failed. Please try again.");
      setLoading(false);
      return;
    }
    setAssignment(result.assignment);
    setLoading(false);
    toast.success("Assignment submitted for review.");
  }

  if (assignment) {
    const status = assignment.reviewed
      ? { icon: CheckCircle2, eyebrow: "Review complete", title: "Feedback is ready" }
      : assignment.seen_at
        ? { icon: Eye, eyebrow: "Assignment seen", title: "Benjamin has seen your work" }
        : { icon: Clock3, eyebrow: "Submitted", title: "Awaiting Benjamin" };
    const StatusIcon = status.icon;
    return (
      <aside className="surface assignment-card">
        <div className="assignment-status-icon"><StatusIcon size={20} /></div>
        <div className="eyebrow">{status.eyebrow}</div>
        <h2 style={{ marginTop: 18 }}>{status.title}</h2>
        <p>{assignment.reviewed ? "Your review call is complete. Benjamin’s notes are saved below for you and your parent or guardian." : assignment.seen_at ? "Your work has been opened. Use the button below to agree on a suitable WhatsApp review-call time." : "Benjamin has been notified. This status updates automatically when your work is opened."}</p>
        {assignment.feedback && <div className="feedback-box"><span>Benjamin’s feedback</span><p>{assignment.feedback}</p></div>}
        {whatsappUrl && !assignment.reviewed && <a className="button ghost" style={{ width: "100%" }} href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={16} /> Schedule WhatsApp call</a>}
      </aside>
    );
  }

  if (!quizCompleted) {
    return (
      <aside className="surface assignment-card assignment-locked">
        <Clock3 size={22} />
        <div className="eyebrow">Complete the knowledge check</div>
        <h2>Practical assignment</h2>
        <p>Submit the lesson quiz and review your answers first. Your assignment upload will unlock when you choose “Continue to assignment.”</p>
      </aside>
    );
  }

  return (
    <aside className="surface assignment-card">
      <h2>Practical assignment</h2><p>{instructions}</p>
      <label className="dropzone"><ImagePlus size={24} /><span>{file ? file.name : "Tap to upload your work"}</span><small>JPG, PNG or WebP · up to 10 MB</small><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
      <button className="button" style={{ width: "100%" }} onClick={submit} disabled={loading}>{loading ? "Uploading…" : "Submit assignment"}</button>
    </aside>
  );
}
