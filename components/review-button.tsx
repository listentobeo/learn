"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ReviewButton({ assignmentId, reviewed }: { assignmentId: string; reviewed: boolean }) {
  const [complete, setComplete] = useState(reviewed);
  async function markComplete() {
    const response = await fetch(`/api/admin/assignments/${assignmentId}`, { method: "PATCH" });
    if (!response.ok) return toast.error("Could not update this review.");
    setComplete(true);
    toast.success("Review marked complete.");
  }
  return <button className={`button ${complete ? "ghost" : ""}`} onClick={markComplete} disabled={complete}><Check size={15} /> {complete ? "Review complete" : "Mark review complete"}</button>;
}
