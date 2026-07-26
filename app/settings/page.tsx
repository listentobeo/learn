import { AppShell } from "@/components/app-shell";
import { PaymentSettings, type PaymentCourse } from "@/components/payment-settings";
import { SettingsForm } from "@/components/settings-form";
import { getCurrentProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { Enrollment } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  let paymentCourses: PaymentCourse[] = [{ track: profile.track, paymentStatus: profile.payment_status, plan: null, subscriptionStatus: null }];
  if (supabase && profile.id !== "demo-student") {
    const [{ data: enrollments }, { data: subscriptions }, { data: payments }] = await Promise.all([
      supabase.from("enrollments").select("student_id,track,enrollment_date,payment_status").eq("student_id", profile.id).order("enrollment_date"),
      supabase.from("subscriptions").select("track,status").eq("student_id", profile.id),
      supabase.from("payments").select("track,plan,paid_at").eq("student_id", profile.id).eq("status", "success").order("paid_at", { ascending: false }),
    ]);
    paymentCourses = ((enrollments || []) as Enrollment[]).map((enrollment) => ({
      track: enrollment.track,
      paymentStatus: enrollment.payment_status,
      plan: (payments || []).find((payment) => payment.track === enrollment.track)?.plan || null,
      subscriptionStatus: (subscriptions || []).find((subscription) => subscription.track === enrollment.track)?.status || null,
    }));
  }
  return (
    <AppShell name={profile.name} track={profile.track} admin={profile.role === "admin"}>
      <div className="dash-head"><div><span className="subtle">Account preferences</span><h1>Settings.</h1></div></div>
      <div className="settings-grid">
        <SettingsForm profile={profile} />
        <aside className="settings-note">
          <strong style={{ color: "var(--ivory)" }}>Your enrollment</strong>
          <p>Your email is tied to your school record. Add courses from Resources and switch between enrolled tracks from your dashboard.</p>
          <a className="gold-link" href="mailto:support@beoarts.com">support@beoarts.com</a>
        </aside>
      </div>
      <PaymentSettings courses={paymentCourses} />
    </AppShell>
  );
}
