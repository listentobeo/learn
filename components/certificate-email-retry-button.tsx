"use client";

import { Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Track } from "@/lib/types";

export function CertificateEmailRetryButton({ studentId, track }: { studentId: string; track: Track }) {
  const [loading, setLoading] = useState(false);
  async function retry() {
    setLoading(true);
    const response = await fetch("/api/certificate/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId, track }),
    });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) return toast.error(result.error || "Unable to retry certificate delivery.");
    if (result.certificate?.email_status === "sent") {
      toast.success("Certificate email delivered.");
      window.location.reload();
    } else toast.error("The email provider still could not deliver this certificate.");
  }
  return <button className="manage-payment gold-link" onClick={retry} disabled={loading}><Mail size={13} /> {loading ? "Sending…" : "Retry email"}</button>;
}
