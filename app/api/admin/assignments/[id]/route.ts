import { after, NextResponse } from "next/server";
import { issueCertificate } from "@/lib/certificates";
import { deliverDueNotifications, queueStudentNotification } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Track } from "@/lib/types";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ demo: true });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const action = body.action || "complete";
  const feedback = typeof body.feedback === "string" ? body.feedback.trim().slice(0, 5000) : "";
  const now = new Date().toISOString();
  const updates = action === "seen"
    ? { seen_at: now }
    : action === "feedback"
      ? { feedback: feedback || null, feedback_at: feedback ? now : null, seen_at: now }
      : { reviewed: true, reviewed_at: now, seen_at: now, feedback: feedback || null, feedback_at: feedback ? now : null };
  const { data, error } = await supabase.from("assignments").update(updates).eq("id", id).select("id,student_id,lesson_code,seen_at,reviewed,reviewed_at,feedback,feedback_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  after(async () => {
    const admin = createAdminClient();
    if (!admin) return;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://learn.beoarts.com";
    try {
      if (action === "seen") {
        await queueStudentNotification(admin, {
          studentId: data.student_id,
          kind: "assignment_seen",
          subject: `${data.lesson_code}: Benjamin has seen your work`,
          message: `Benjamin has opened your ${data.lesson_code} assignment. You can now choose an available review-call time inside the school.`,
          link: `${siteUrl}/reviews`,
          relatedType: "assignment",
          relatedId: data.id,
          dedupeKey: `assignment-seen:${data.id}`,
          includeParent: true,
        });
      }
      if (action === "feedback" || action === "complete") {
        await queueStudentNotification(admin, {
          studentId: data.student_id,
          kind: "feedback_ready",
          subject: `${data.lesson_code}: your feedback is ready`,
          message: `Benjamin's notes for ${data.lesson_code} are now available in your progress record.`,
          link: `${siteUrl}/progress`,
          relatedType: "assignment",
          relatedId: data.id,
          dedupeKey: `feedback-ready:${data.id}:${data.feedback_at || data.reviewed_at || "saved"}`,
          includeParent: true,
        });
      }
      if (action === "complete") {
        await admin.from("review_bookings").update({ status: "completed", updated_at: now }).eq("assignment_id", data.id).eq("status", "booked");
        const { data: lesson } = await admin.from("lessons").select("track").eq("lesson_code", data.lesson_code).single();
        if (lesson?.track) await issueCertificate(admin, data.student_id, lesson.track as Track);
      }
      await deliverDueNotifications(admin, 10);
    } catch {
      // Completion and notification queues provide scheduled retry paths.
    }
  });
  return NextResponse.json({ assignment: data });
}
