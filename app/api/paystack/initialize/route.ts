import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { resolveCountryCode } from "@/lib/geo";
import { getOrCreateMonthlyPlan } from "@/lib/paystack";
import { coursePrices } from "@/lib/pricing";

const payload = z.object({
  track: z.enum(["Drawing", "Painting", "Discovery"]),
  plan: z.enum(["full", "monthly"]),
});

export async function POST(request: Request) {
  const parsed = payload.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payment option" }, { status: 400 });
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const supabase = await createClient();
  if (!secret || !supabase || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const missing = [
      !secret && "PAYSTACK_SECRET_KEY",
      !process.env.NEXT_PUBLIC_SUPABASE_URL && "NEXT_PUBLIC_SUPABASE_URL",
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      !process.env.SUPABASE_SERVICE_ROLE_KEY && "SUPABASE_SERVICE_ROLE_KEY",
    ].filter(Boolean);
    return NextResponse.json({ error: `Payment setup is missing ${missing.join(", ")} in the deployed environment. Add it and redeploy.` }, { status: 503 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  const { track, plan } = parsed.data;
  const { data: existingEnrollment, error: enrollmentError } = await supabase.from("enrollments").select("payment_status").eq("student_id", user.id).eq("track", track).maybeSingle();
  if (enrollmentError) return NextResponse.json({ error: "The multi-track enrollment migration has not been applied in Supabase." }, { status: 503 });
  if (existingEnrollment?.payment_status === "active") {
    return NextResponse.json({ error: `You are already enrolled in ${track}. Open it from Resources.` }, { status: 409 });
  }
  if (existingEnrollment?.payment_status === "past_due") {
    return NextResponse.json({ error: "This course has a past-due subscription. Manage the payment from Settings instead of starting another subscription." }, { status: 409 });
  }
  const countryCode = await resolveCountryCode(request.headers);
  const international = countryCode !== "NG";
  const currency = "NGN" as const;
  const price = coursePrices[track][currency];
  const amount = plan === "monthly" ? price.monthly : price.full;
  if (!amount || (track === "Discovery" && plan === "monthly")) {
    return NextResponse.json({ error: "That payment plan is not available" }, { status: 400 });
  }
  const reference = `BEO-${user.id.slice(0, 8)}-${Date.now()}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  let paystackPlan: string | undefined;
  if (plan === "monthly") {
    try {
      paystackPlan = await getOrCreateMonthlyPlan(track as Exclude<typeof track, "Discovery">, currency, amount);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to prepare the monthly payment plan." }, { status: 502 });
    }
  }
  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: user.email,
      amount: amount * 100,
      currency,
      channels: international || plan === "monthly" ? ["card"] : ["card", "bank_transfer", "ussd"],
      reference,
      callback_url: `${siteUrl}/dashboard?payment=success`,
      ...(paystackPlan ? { plan: paystackPlan, invoice_limit: 3 } : {}),
      metadata: { student_id: user.id, track, plan, country_code: countryCode, currency },
    }),
  });
  const result = await response.json();
  if (!response.ok) return NextResponse.json({ error: result.message || "Payment initialization failed" }, { status: 502 });
  return NextResponse.json({ access_code: result.data.access_code, reference: result.data.reference });
}
