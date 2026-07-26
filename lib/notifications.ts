import type { SupabaseClient } from "@supabase/supabase-js";
import type { Track } from "@/lib/types";

type NotificationKind =
  | "enrollment_confirmed"
  | "lesson_unlocked"
  | "assignment_due"
  | "assignment_seen"
  | "feedback_ready"
  | "review_booked"
  | "review_reminder"
  | "payment_reminder"
  | "payment_failed"
  | "parent_progress";

type QueueInput = {
  studentId: string;
  kind: NotificationKind;
  subject: string;
  message: string;
  dedupeKey: string;
  relatedType?: string;
  relatedId?: string;
  scheduledFor?: string;
  link?: string;
  includeParent?: boolean;
};

type StudentContact = {
  name: string;
  email: string;
  phone: string | null;
  parent_name: string | null;
  parent_email: string | null;
  email_notifications: boolean;
  whatsapp_notifications: boolean;
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] || character);
}

function emailHtml(name: string, message: string, link?: string) {
  const safeName = escapeHtml(name);
  const safeMessage = escapeHtml(message).replaceAll("\n", "<br>");
  const action = link ? `<p><a href="${escapeHtml(link)}" style="background:#C9A84C;color:#0A0E17;padding:12px 18px;text-decoration:none;font-weight:700;display:inline-block">Open Beo School</a></p>` : "";
  return `<div style="background:#0A0E17;color:#F6F1E7;padding:30px;font-family:Arial,sans-serif">
    <p>Hello ${safeName},</p><p style="line-height:1.7">${safeMessage}</p>${action}
    <p style="color:#C9A84C">— Benjamin Odeke<br><span style="color:#9CA3AF">Beo School of Art</span></p>
  </div>`;
}

export async function queueStudentNotification(admin: SupabaseClient, input: QueueInput) {
  const { data: contact, error } = await admin
    .from("profiles")
    .select("name,email,phone,parent_name,parent_email,email_notifications,whatsapp_notifications")
    .eq("id", input.studentId)
    .single();
  if (error || !contact) throw error || new Error("Student contact not found");
  const student = contact as StudentContact;
  const jobs: Record<string, unknown>[] = [];
  const scheduledFor = input.scheduledFor || new Date().toISOString();

  if (student.email_notifications && student.email) {
    jobs.push({
      student_id: input.studentId,
      channel: "email",
      kind: input.kind,
      recipient: student.email,
      subject: input.subject,
      payload: { name: student.name, message: input.message, link: input.link },
      related_type: input.relatedType,
      related_id: input.relatedId,
      scheduled_for: scheduledFor,
      dedupe_key: `${input.dedupeKey}:email`,
    });
  }
  if (student.whatsapp_notifications && student.phone) {
    jobs.push({
      student_id: input.studentId,
      channel: "whatsapp",
      kind: input.kind,
      recipient: student.phone.replace(/\D/g, ""),
      subject: input.subject,
      payload: { name: student.name, message: input.message, link: input.link },
      related_type: input.relatedType,
      related_id: input.relatedId,
      scheduled_for: scheduledFor,
      dedupe_key: `${input.dedupeKey}:whatsapp`,
    });
  }
  if (input.includeParent && student.parent_email) {
    jobs.push({
      student_id: input.studentId,
      channel: "email",
      kind: input.kind,
      recipient: student.parent_email,
      subject: input.subject,
      payload: { name: student.parent_name || "Parent or guardian", message: input.message, link: input.link },
      related_type: input.relatedType,
      related_id: input.relatedId,
      scheduled_for: scheduledFor,
      dedupe_key: `${input.dedupeKey}:parent`,
    });
  }
  if (!jobs.length) return;
  const { error: insertError } = await admin.from("notification_jobs").upsert(jobs, { onConflict: "dedupe_key", ignoreDuplicates: true });
  if (insertError) throw insertError;
}

async function deliverEmail(job: Record<string, any>) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  const payload = job.payload || {};
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "Beo School of Art <school@learn.beoarts.com>",
      to: [job.recipient],
      subject: job.subject || "An update from Beo School of Art",
      html: emailHtml(payload.name || "Artist", payload.message || "", payload.link),
    }),
  });
  if (!response.ok) throw new Error(`Resend returned ${response.status}: ${await response.text()}`);
}

async function deliverWhatsApp(job: Record<string, any>) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) throw new Error("WhatsApp Cloud API is not configured");
  const payload = job.payload || {};
  const body = [`Hello ${payload.name || "Artist"},`, payload.message, payload.link, "— Beo School of Art"].filter(Boolean).join("\n\n");
  const response = await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: job.recipient, type: "text", text: { body } }),
  });
  if (!response.ok) throw new Error(`WhatsApp returned ${response.status}: ${await response.text()}`);
}

export async function deliverDueNotifications(admin: SupabaseClient, limit = 50) {
  const { data: jobs, error } = await admin.rpc("claim_notification_jobs", { p_limit: limit });
  if (error) throw error;
  let sent = 0;
  let failed = 0;

  for (const job of jobs || []) {
    try {
      if (job.channel === "email") await deliverEmail(job);
      else await deliverWhatsApp(job);
      await admin.from("notification_jobs").update({ status: "sent", sent_at: new Date().toISOString(), last_error: null }).eq("id", job.id);
      sent += 1;
    } catch (deliveryError) {
      await admin.from("notification_jobs").update({
        status: "failed",
        last_error: deliveryError instanceof Error ? deliveryError.message.slice(0, 2000) : "Unknown delivery error",
      }).eq("id", job.id);
      failed += 1;
    }
  }
  return { processed: (jobs || []).length, sent, failed };
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function enqueueSchoolReminders(admin: SupabaseClient) {
  const now = new Date();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://learn.beoarts.com";
  const [{ data: enrollments }, { data: lessons }, { data: assignments }, { data: quizzes }, { data: bookings }, { data: subscriptions }] = await Promise.all([
    admin.from("enrollments").select("student_id,track,enrollment_date").eq("payment_status", "active"),
    admin.from("lessons").select("track,lesson_code,title,week_number"),
    admin.from("assignments").select("student_id,lesson_code,reviewed"),
    admin.from("quiz_submissions").select("student_id,lesson_code"),
    admin.from("review_bookings").select("id,student_id,lesson_code,review_slots(starts_at)").eq("status", "booked"),
    admin.from("subscriptions").select("id,student_id,track,next_payment_date,status").eq("status", "active"),
  ]);
  const submitted = new Set((assignments || []).map((assignment) => `${assignment.student_id}:${assignment.lesson_code}`));
  const quizSubmitted = new Set((quizzes || []).map((quiz) => `${quiz.student_id}:${quiz.lesson_code}`));
  const reviewCompleted = new Set((assignments || []).filter((assignment) => assignment.reviewed).map((assignment) => `${assignment.student_id}:${assignment.lesson_code}`));
  const lagosDay = Number(new Intl.DateTimeFormat("en", { day: "numeric", timeZone: "Africa/Lagos" }).format(now));
  const monthKey = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "Africa/Lagos" }).format(now);

  for (const enrollment of enrollments || []) {
    const trackLessons = (lessons || []).filter((item) => item.track === enrollment.track);
    for (const lesson of trackLessons) {
      const unlockDate = new Date(enrollment.enrollment_date);
      if (enrollment.track !== "Discovery") unlockDate.setUTCDate(unlockDate.getUTCDate() + (lesson.week_number - 1) * 7);
      const hoursSinceUnlock = (now.getTime() - unlockDate.getTime()) / 3_600_000;
      if (hoursSinceUnlock >= 0 && hoursSinceUnlock < 36 && (enrollment.track !== "Discovery" || lesson.week_number === 1)) {
        await queueStudentNotification(admin, {
          studentId: enrollment.student_id,
          kind: "lesson_unlocked",
          subject: `${lesson.lesson_code} is now open`,
          message: `${lesson.title} is now available in your ${enrollment.track} Track. Watch the lesson, complete the knowledge check, and begin the practical work when you are ready.`,
          link: `${siteUrl}/lesson/${lesson.lesson_code}`,
          relatedType: "lesson",
          relatedId: lesson.lesson_code,
          dedupeKey: `lesson-unlocked:${enrollment.student_id}:${lesson.lesson_code}`,
        });
      }
      if (hoursSinceUnlock >= 120 && hoursSinceUnlock < 156 && quizSubmitted.has(`${enrollment.student_id}:${lesson.lesson_code}`) && !submitted.has(`${enrollment.student_id}:${lesson.lesson_code}`)) {
        await queueStudentNotification(admin, {
          studentId: enrollment.student_id,
          kind: "assignment_due",
          subject: `A gentle reminder for ${lesson.lesson_code}`,
          message: `Your practical work for ${lesson.title} has not been submitted yet. Return to the lesson when you have a quiet moment and upload a clear photograph of your work.`,
          link: `${siteUrl}/lesson/${lesson.lesson_code}`,
          relatedType: "lesson",
          relatedId: lesson.lesson_code,
          dedupeKey: `assignment-due:${enrollment.student_id}:${lesson.lesson_code}`,
        });
      }
    }
    if (lagosDay === 1) {
      const completedQuizzes = trackLessons.filter((lesson) => quizSubmitted.has(`${enrollment.student_id}:${lesson.lesson_code}`)).length;
      const completedReviews = trackLessons.filter((lesson) => reviewCompleted.has(`${enrollment.student_id}:${lesson.lesson_code}`)).length;
      await queueStudentNotification(admin, {
        studentId: enrollment.student_id,
        kind: "parent_progress",
        subject: `${enrollment.track} monthly progress summary`,
        message: `This month’s ${enrollment.track} summary: ${completedQuizzes} of ${trackLessons.length} knowledge checks submitted and ${completedReviews} of ${trackLessons.length} assignment reviews complete. Open Progress to read the full lesson-by-lesson record and Benjamin’s feedback.`,
        link: `${siteUrl}/progress?track=${enrollment.track}`,
        relatedType: "enrollment",
        relatedId: `${enrollment.student_id}:${enrollment.track}`,
        dedupeKey: `parent-progress:${enrollment.student_id}:${enrollment.track}:${monthKey}`,
        includeParent: true,
      });
    }
  }

  for (const booking of bookings || []) {
    const relation = booking.review_slots as unknown as { starts_at: string } | { starts_at: string }[] | null;
    const startsAt = Array.isArray(relation) ? relation[0]?.starts_at : relation?.starts_at;
    if (!startsAt) continue;
    const hoursUntil = (new Date(startsAt).getTime() - now.getTime()) / 3_600_000;
    if (hoursUntil >= 20 && hoursUntil <= 28) {
      await queueStudentNotification(admin, {
        studentId: booking.student_id,
        kind: "review_reminder",
        subject: `Your ${booking.lesson_code} review call is tomorrow`,
        message: `Your review call is scheduled for ${new Date(startsAt).toLocaleString("en-NG", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Lagos" })}. Keep your artwork and lesson notes nearby.`,
        link: `${siteUrl}/reviews`,
        relatedType: "review_booking",
        relatedId: booking.id,
        dedupeKey: `review-reminder:${booking.id}`,
        includeParent: true,
      });
    }
  }

  for (const subscription of subscriptions || []) {
    if (!subscription.next_payment_date) continue;
    const hoursUntil = (new Date(subscription.next_payment_date).getTime() - now.getTime()) / 3_600_000;
    if (hoursUntil >= 48 && hoursUntil <= 72) {
      await queueStudentNotification(admin, {
        studentId: subscription.student_id,
        kind: "payment_reminder",
        subject: `Upcoming ${subscription.track} payment`,
        message: `Your next guided-track payment is scheduled for ${new Date(subscription.next_payment_date).toLocaleDateString("en-NG")}. You can review your payment status from Settings.`,
        link: `${siteUrl}/settings`,
        relatedType: "subscription",
        relatedId: subscription.id,
        dedupeKey: `payment-reminder:${subscription.id}:${dayKey(new Date(subscription.next_payment_date))}`,
      });
    }
  }
}
