import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { countryCodeFromHeaders } from "@/lib/geo";
import { getOrCreateMonthlyPlan } from "@/lib/paystack";
import { coursePrices, type Currency } from "@/lib/pricing";

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
    return NextResponse.json({ error: "Live enrollment is not configured yet. Please contact support." }, { status: 503 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  const { track, plan } = parsed.data;
  const countryCode = countryCodeFromHeaders(request.headers);
  const international = countryCode !== "NG";
  const currency: Currency = international ? "USD" : "NGN";
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
