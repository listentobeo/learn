"use client";

import { CreditCard, ExternalLink, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import type { Track } from "@/lib/types";

export type PaymentCourse = {
  track: Track;
  paymentStatus: string;
  plan: "full" | "monthly" | null;
  subscriptionStatus: string | null;
};

export function PaymentSettings({ courses }: { courses: PaymentCourse[] }) {
  const [loading, setLoading] = useState<Track | null>(null);

  async function manage(track: Track) {
    setLoading(track);
    const response = await fetch(`/api/paystack/subscription/manage?track=${track}`, { cache: "no-store" });
    const result = await response.json();
    setLoading(null);
    if (!response.ok || !result.url) return toast.error(result.error || "Unable to open payment management.");
    window.location.assign(result.url);
  }

  return (
    <section className="surface payment-settings">
      <div className="payment-settings-head"><div><h2>Courses and payments</h2><p className="subtle">View each enrollment and manage recurring Paystack billing.</p></div><Link className="button ghost small" href="/resources"><Plus size={14} /> Add course</Link></div>
      <div className="payment-course-list">
        {courses.map((course) => (
          <div className="payment-course" key={course.track}>
            <CreditCard size={18} />
            <div><strong>{course.track}{course.track === "Discovery" ? "" : " Guided"}</strong><span>{course.plan === "monthly" ? `Monthly · ${course.subscriptionStatus || course.paymentStatus}` : course.plan === "full" ? "Paid in full" : course.paymentStatus}</span></div>
            {course.plan === "monthly" && course.track !== "Discovery" && <button className="gold-link manage-payment" onClick={() => manage(course.track)} disabled={loading === course.track}>{loading === course.track ? "Opening…" : <>Manage <ExternalLink size={12} /></>}</button>}
          </div>
        ))}
      </div>
    </section>
  );
}
