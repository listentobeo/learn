import { AdminReviewScheduler } from "@/components/admin-review-scheduler";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const supabase = await createClient();
  let slots: Array<{ id: string; starts_at: string; ends_at: string; is_available: boolean }> = [];
  let bookings: Array<{ id: string; studentId: string; lesson_code: string; status: string; studentName: string; studentNote: string; startsAt: string }> = [];
  if (supabase) {
    const [{ data: slotRows }, { data: bookingRows }] = await Promise.all([
      supabase.from("review_slots").select("id,starts_at,ends_at,is_available").gt("starts_at", new Date().toISOString()).order("starts_at"),
      supabase.from("review_bookings").select("id,student_id,lesson_code,status,student_note,review_slots(starts_at)").in("status", ["booked", "completed"]).order("booked_at", { ascending: false }),
    ]);
    slots = slotRows || [];
    const studentIds = [...new Set((bookingRows || []).map((booking) => booking.student_id))];
    const { data: profiles } = studentIds.length ? await supabase.from("profiles").select("id,name").in("id", studentIds) : { data: [] };
    const names = new Map((profiles || []).map((profile) => [profile.id, profile.name]));
    bookings = (bookingRows || []).map((booking) => {
      const relation = booking.review_slots as unknown as { starts_at: string } | { starts_at: string }[];
      return { id: booking.id, studentId: booking.student_id, lesson_code: booking.lesson_code, status: booking.status, studentName: names.get(booking.student_id) || "Student", studentNote: booking.student_note || "", startsAt: (Array.isArray(relation) ? relation[0] : relation)?.starts_at || "" };
    });
  }
  return (
    <AppShell admin name="Benjamin Odeke" track="">
      <div className="dash-head"><div><span className="subtle">Availability and appointments</span><h1>Review calls.</h1></div><span className="pill">{bookings.filter((booking) => booking.status === "booked").length} upcoming</span></div>
      <div className="settings-grid">
        <AdminReviewScheduler />
        <aside className="surface"><h2>Open times</h2>{slots.length ? slots.map((slot) => <div className="integration-row" key={slot.id}><span>{new Date(slot.starts_at).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" })}</span><strong className={slot.is_available ? "ready" : "missing"}>{slot.is_available ? "Open" : "Booked"}</strong></div>) : <p className="subtle">No future times added.</p>}</aside>
      </div>
      <div className="content-title"><h2>Appointments</h2></div>
      <div className="surface">{bookings.length ? bookings.map((booking) => <div className="integration-row review-admin-row" key={booking.id}><span><Link className="gold-link" href={`/admin/student/${booking.studentId}`}><strong>{booking.lesson_code}</strong> · {booking.studentName}</Link>{booking.studentNote && <small>{booking.studentNote}</small>}</span><span>{booking.startsAt ? new Date(booking.startsAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos" }) : "Time unavailable"}</span><strong className={booking.status === "completed" ? "ready" : ""}>{booking.status}</strong></div>) : <p className="subtle">No review calls booked yet.</p>}</div>
    </AppShell>
  );
}
