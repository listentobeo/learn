"use client";

import { CalendarClock, MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Slot = { id: string; starts_at: string; ends_at: string };
type AssignmentOption = { id: string; lesson_code: string };
type Booking = { id: string; assignment_id: string; lesson_code: string; status: string; starts_at: string; ends_at: string };

function slotLabel(slot: { starts_at: string; ends_at: string }) {
  const start = new Date(slot.starts_at);
  const end = new Date(slot.ends_at);
  return `${start.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Lagos" })} · ${start.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" })}–${end.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" })} WAT`;
}

export function ReviewBookingPanel({
  assignments,
  slots,
  initialBookings,
  whatsappNumber,
  studentName,
}: {
  assignments: AssignmentOption[];
  slots: Slot[];
  initialBookings: Booking[];
  whatsappNumber?: string;
  studentName: string;
}) {
  const [bookings, setBookings] = useState(initialBookings);
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const whatsappRecipient = whatsappNumber?.replace(/\D/g, "");

  async function book(assignment: AssignmentOption) {
    const slotId = selectedSlots[assignment.id];
    if (!slotId) return toast.error("Choose an available review time.");
    setLoading(assignment.id);
    const response = await fetch("/api/reviews/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId: assignment.id, slotId, note: notes[assignment.id] || "" }),
    });
    const result = await response.json();
    setLoading(null);
    if (!response.ok) return toast.error(result.error || "Unable to book this review time.");
    setBookings((current) => [...current, result.booking]);
    toast.success("Your review call is booked.");
  }

  async function cancel(bookingId: string) {
    setLoading(bookingId);
    const response = await fetch("/api/reviews/book", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    });
    const result = await response.json();
    setLoading(null);
    if (!response.ok) return toast.error(result.error || "Unable to cancel this booking.");
    setBookings((current) => current.map((booking) => booking.id === bookingId ? { ...booking, status: "cancelled" } : booking));
    toast.success("Review call cancelled.");
  }

  return (
    <div className="review-booking-list">
      {assignments.map((assignment) => {
        const booking = bookings.find((item) => item.assignment_id === assignment.id && item.status === "booked");
        return (
          <section className="surface review-booking-card" key={assignment.id}>
            <div><span className="lesson-code">{assignment.lesson_code}</span><h2>Assignment review call</h2></div>
            {booking ? (
              <div className="booked-call">
                <CalendarClock size={20} />
                <div><strong>{slotLabel(booking)}</strong><span>Keep your artwork and lesson notes nearby.</span></div>
                <div className="booked-call-actions">
                  {whatsappRecipient && <a className="button small" href={`https://wa.me/${whatsappRecipient}?text=${encodeURIComponent(`Hello Benjamin, I am ${studentName}. I am ready for my ${booking.lesson_code} review call.`)}`} target="_blank" rel="noreferrer"><MessageCircle size={14} /> Open WhatsApp</a>}
                  <button className="button ghost small" onClick={() => cancel(booking.id)} disabled={loading === booking.id}><X size={14} /> Cancel</button>
                </div>
              </div>
            ) : slots.length ? (
              <div className="booking-form">
                <div className="field">
                  <label htmlFor={`slot-${assignment.id}`}>Choose an available time</label>
                  <select className="input" id={`slot-${assignment.id}`} value={selectedSlots[assignment.id] || ""} onChange={(event) => setSelectedSlots((current) => ({ ...current, [assignment.id]: event.target.value }))}>
                    <option value="">Select a review time</option>
                    {slots.map((slot) => <option value={slot.id} key={slot.id}>{slotLabel(slot)}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor={`note-${assignment.id}`}>Anything Benjamin should know? (optional)</label>
                  <textarea className="input feedback-input" id={`note-${assignment.id}`} value={notes[assignment.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [assignment.id]: event.target.value }))} maxLength={1000} />
                </div>
                <button className="button" onClick={() => book(assignment)} disabled={loading === assignment.id}>Book review call</button>
              </div>
            ) : <p className="subtle">Benjamin has not opened new review times yet. You will be notified when times are available.</p>}
          </section>
        );
      })}
      {!assignments.length && <div className="empty-state"><CalendarClock size={25} /><strong>No call to schedule yet</strong><span>When Benjamin has seen an assignment, its review-call options will appear here.</span></div>}
    </div>
  );
}
