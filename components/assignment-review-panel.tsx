"use client";

import { Check, ExternalLink, Eye, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function AssignmentReviewPanel({
  assignmentId,
  lessonCode,
  viewUrl,
  initialSeenAt,
  initialReviewed,
  initialFeedback,
}: {
  assignmentId: string;
  lessonCode: string;
  viewUrl: string | null;
  initialSeenAt: string | null;
  initialReviewed: boolean;
  initialFeedback: string | null;
}) {
  const [seenAt, setSeenAt] = useState(initialSeenAt);
  const [reviewed, setReviewed] = useState(initialReviewed);
  const [feedback, setFeedback] = useState(initialFeedback || "");
  const [loading, setLoading] = useState(false);

  async function update(action: "seen" | "feedback" | "complete") {
    setLoading(true);
    const response = await fetch(`/api/admin/assignments/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, feedback }),
    });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) return toast.error(result.error || "Unable to update the review.");
    setSeenAt(result.assignment?.seen_at || seenAt);
    setReviewed(Boolean(result.assignment?.reviewed));
    if (action === "feedback") toast.success("Feedback saved for the student.");
    if (action === "complete") toast.success("Review call marked complete.");
  }

  return (
    <div className="assignment-review">
      <div className="assignment-review-head">
        <strong>{lessonCode}</strong>
        <span className={reviewed ? "review-state complete" : seenAt ? "review-state seen" : "review-state"}>{reviewed ? "Review complete" : seenAt ? "Student notified: seen" : "Not opened"}</span>
      </div>
      {viewUrl ? <a className="button ghost" href={viewUrl} target="_blank" rel="noreferrer" onClick={() => { if (!seenAt) void update("seen"); }}><Eye size={15} /> Open student work <ExternalLink size={13} /></a> : <p className="subtle">The private image is unavailable.</p>}
      <div className="field">
        <label htmlFor={`feedback-${assignmentId}`}>Feedback for student and parent</label>
        <textarea className="input feedback-input" id={`feedback-${assignmentId}`} value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="Add the clear notes, strengths, and next steps discussed during the call." maxLength={5000} />
      </div>
      <div className="review-actions">
        <button className="button ghost small" onClick={() => update("feedback")} disabled={loading}><Save size={14} /> Save feedback</button>
        <button className="button small" onClick={() => update("complete")} disabled={loading || !feedback.trim()}><Check size={14} /> Mark call complete</button>
      </div>
    </div>
  );
}
