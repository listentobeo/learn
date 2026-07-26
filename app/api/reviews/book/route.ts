import { after, NextResponse } from "next/server";
import { z } from "zod";
import { deliverDueNotifications, queueStudentNotification } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const bookPayload = z.object({
  assignmentId: z.string().uuid(),
  slotId: z.string().uuid(),
  note: z.string().max(1000).default(""),
});

export async function POST(request: Request) {
  const parsed = bookPayload.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid booking request" }, { status: 400 });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Live scheduling requires Supabase" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: selectedSlot } = await supabase.from("review_slots").select("starts_at,ends_at").eq("id", parsed.data.slotId).single();
  const { data, error } = await supabase.rpc("book_review_call", {
    p_assignment_id: parsed.data.assignmentId,
    p_slot_id: parsed.data.slotId,
    p_student_note: parsed.data.note,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const booking = Array.isArray(data) ? data[0] : data;
  const responseBooking = { ...booking, starts_at: selectedSlot?.starts_at, ends_at: selectedSlot?.ends_at };
  after(async () => {
    const admin = createAdminClient();
    if (!admin || !selectedSlot?.starts_at) return;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://learn.beoarts.com";
    try {
      await queueStudentNotification(admin, {
        studentId: user.id,
        kind: "review_booked",
        subject: `${booking.lesson_code}: review call confirmed`,
        message: `Your review call is booked for ${new Date(selectedSlot.starts_at).toLocaleString("en-NG", { dateStyle: "full", timeStyle: "short", timeZone: "Africa/Lagos" })}.`,
        link: `${siteUrl}/reviews`,
        relatedType: "review_booking",
        relatedId: booking.id,
        dedupeKey: `review-booked:${booking.id}`,
        includeParent: true,
      });
      await deliverDueNotifications(admin, 5);
    } catch {
      // The booking remains valid if a confirmation provider is unavailable.
    }
  });
  return NextResponse.json({ booking: responseBooking });
}

export async function DELETE(request: Request) {
  const parsed = z.object({ bookingId: z.string().uuid() }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid booking" }, { status: 400 });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Live scheduling requires Supabase" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { error } = await supabase.rpc("cancel_review_call", { p_booking_id: parsed.data.bookingId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ cancelled: true });
}
