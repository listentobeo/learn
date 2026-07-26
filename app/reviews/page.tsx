import { AppShell } from "@/components/app-shell";
import { ReviewBookingPanel } from "@/components/review-booking-panel";
import { getCurrentProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  let assignments: Array<{ id: string; lesson_code: string }> = [];
  let slots: Array<{ id: string; starts_at: string; ends_at: string }> = [];
  let bookings: Array<{ id: string; assignment_id: string; lesson_code: string; status: string; starts_at: string; ends_at: string }> = [];
  if (supabase && profile.id !== "demo-student") {
    const [{ data: assignmentRows }, { data: slotRows }, { data: bookingRows }] = await Promise.all([
      supabase.from("assignments").select("id,lesson_code").eq("student_id", profile.id).not("seen_at", "is", null).eq("reviewed", false).order("submitted_at"),
      supabase.from("review_slots").select("id,starts_at,ends_at").eq("is_available", true).gt("starts_at", new Date().toISOString()).order("starts_at").limit(30),
      supabase.from("review_bookings").select("id,assignment_id,lesson_code,status,review_slots(starts_at,ends_at)").eq("student_id", profile.id).order("booked_at", { ascending: false }),
    ]);
    assignments = assignmentRows || [];
    slots = slotRows || [];
    bookings = (bookingRows || []).map((booking) => {
      const relation = booking.review_slots as unknown as { starts_at: string; ends_at: string } | { starts_at: string; ends_at: string }[];
      const slot = Array.isArray(relation) ? relation[0] : relation;
      return { id: booking.id, assignment_id: booking.assignment_id, lesson_code: booking.lesson_code, status: booking.status, starts_at: slot?.starts_at || "", ends_at: slot?.ends_at || "" };
    });
  }
  return (
    <AppShell name={profile.name} track={profile.track}>
      <div className="dash-head"><div><span className="subtle">One-to-one guidance</span><h1>Review calls.</h1></div></div>
      <section className="settings-note review-intro"><strong>How review calls work</strong><p>After Benjamin opens an assignment, choose one available time here. Your submission stays inside the school; WhatsApp is only the call channel when the appointment begins.</p></section>
      <ReviewBookingPanel assignments={assignments} slots={slots} initialBookings={bookings} whatsappNumber={process.env.BENJAMIN_WHATSAPP_NUMBER} studentName={profile.name} />
    </AppShell>
  );
}
