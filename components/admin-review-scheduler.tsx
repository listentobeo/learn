"use client";

import { CalendarPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function AdminReviewScheduler() {
  const [startsAt, setStartsAt] = useState("");
  const [duration, setDuration] = useState("30");
  const [loading, setLoading] = useState(false);

  async function addSlot() {
    if (!startsAt) return toast.error("Choose a date and time.");
    setLoading(true);
    const response = await fetch("/api/admin/review-slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startsAt: new Date(startsAt).toISOString(), durationMinutes: Number(duration) }),
    });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) return toast.error(result.error || "Unable to add this review time.");
    toast.success("Review time added.");
    setStartsAt("");
    window.location.reload();
  }

  return (
    <section className="surface">
      <div className="eyebrow"><CalendarPlus size={15} /> Availability</div>
      <h2 style={{ marginTop: 18 }}>Open a review time</h2>
      <div className="form-row">
        <div className="field"><label htmlFor="review-start">Date and time</label><input className="input" id="review-start" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></div>
        <div className="field"><label htmlFor="review-duration">Duration</label><select className="input" id="review-duration" value={duration} onChange={(event) => setDuration(event.target.value)}><option value="20">20 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option></select></div>
      </div>
      <button className="button" style={{ marginTop: 18 }} onClick={addSlot} disabled={loading}>{loading ? "Adding…" : "Add review time"}</button>
    </section>
  );
}
