import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { recordSubscription, recordSuccessfulCharge, updateSubscriptionStatus } from "@/lib/paystack";

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const raw = await request.text();
  const expected = crypto.createHmac("sha512", secret).update(raw).digest("hex");
  const signature = request.headers.get("x-paystack-signature");
  if (!signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  try {
    if (event.event === "charge.success") await recordSuccessfulCharge(event.data);
    if (event.event === "subscription.create") await recordSubscription(event.data);
    if (event.event === "invoice.payment_failed") await updateSubscriptionStatus(event.data, "past_due");
    if (event.event === "subscription.disable") {
      await updateSubscriptionStatus(event.data, event.data?.status === "complete" ? "complete" : "cancelled");
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook processing failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
