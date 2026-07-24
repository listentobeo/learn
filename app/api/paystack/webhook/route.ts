import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !url || !serviceKey) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });

  const raw = await request.text();
  const expected = crypto.createHmac("sha512", secret).update(raw).digest("hex");
  const signature = request.headers.get("x-paystack-signature");
  if (!signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(raw);
  if (event.event === "charge.success") {
    const { student_id, track, plan, country_code } = event.data.metadata || {};
    if (student_id && track) {
      const admin = createClient(url, serviceKey);
      const enrollmentDate = new Date(event.data.paid_at || Date.now()).toISOString();
      await Promise.all([
        admin.from("profiles").update({ track, payment_status: "active", enrollment_date: enrollmentDate }).eq("id", student_id),
        admin.from("payments").upsert({
          reference: event.data.reference,
          student_id,
          amount: event.data.amount / 100,
          currency: event.data.currency || "NGN",
          country_code: country_code || event.data.authorization?.country_code || null,
          channel: event.data.channel || null,
          track,
          plan,
          status: "success",
          paid_at: enrollmentDate,
        }, { onConflict: "reference" }),
      ]);
    }
  }
  return NextResponse.json({ received: true });
}
