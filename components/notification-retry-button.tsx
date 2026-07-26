"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function NotificationRetryButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  async function retry() {
    setLoading(true);
    const response = await fetch(`/api/admin/notifications/${id}`, { method: "PATCH" });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) return toast.error(result.error || "Unable to queue this retry.");
    toast.success("Notification queued for retry.");
    window.location.reload();
  }
  return <button className="manage-payment gold-link" onClick={retry} disabled={loading}><RotateCcw size={13} /> {loading ? "Queuing…" : "Retry"}</button>;
}
