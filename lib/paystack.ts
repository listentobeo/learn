import { createClient } from "@supabase/supabase-js";
import { deliverDueNotifications, queueStudentNotification } from "./notifications";
import type { Currency } from "./pricing";
import type { Track } from "./types";

const monthlyInvoiceLimit = 3;

export function paystackAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Supabase payment configuration is incomplete.");
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function paystackRequest(path: string, init?: RequestInit) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error("Paystack is not configured.");
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok || !result.status) throw new Error(result.message || "Paystack request failed.");
  return result.data;
}

export async function getOrCreateMonthlyPlan(track: Exclude<Track, "Discovery">, currency: Currency, amount: number) {
  const envName = `PAYSTACK_${track.toUpperCase()}_MONTHLY_PLAN_CODE_${currency}`;
  const configuredCode = process.env[envName];
  const admin = paystackAdmin();
  if (configuredCode) {
    const { error } = await admin.from("paystack_plans").upsert({
      track,
      currency,
      plan_code: configuredCode,
      amount,
      invoice_limit: monthlyInvoiceLimit,
    }, { onConflict: "track,currency" });
    if (error) throw new Error(`Unable to save configured Paystack plan: ${error.message}`);
    return configuredCode;
  }
  const { data: existing } = await admin.from("paystack_plans").select("plan_code,amount").eq("track", track).eq("currency", currency).maybeSingle();
  if (existing?.plan_code && Number(existing.amount) === amount) return existing.plan_code;

  const plan = await paystackRequest("/plan", {
    method: "POST",
    body: JSON.stringify({
      name: `Beo ${track} Guided — 3 monthly payments (${currency})`,
      interval: "monthly",
      amount: amount * 100,
      currency,
      invoice_limit: monthlyInvoiceLimit,
    }),
  });
  const { error } = await admin.from("paystack_plans").upsert({
    track,
    currency,
    plan_code: plan.plan_code,
    amount,
    invoice_limit: monthlyInvoiceLimit,
  }, { onConflict: "track,currency" });
  if (error) throw new Error(`Unable to save Paystack plan: ${error.message}`);
  return plan.plan_code as string;
}

function subscriptionCode(data: any) {
  return typeof data?.subscription === "string" ? data.subscription : data?.subscription?.subscription_code;
}

export async function recordSuccessfulCharge(data: any) {
  const admin = paystackAdmin();
  const metadata = data?.metadata || {};
  let studentId = metadata.student_id as string | undefined;
  let track = metadata.track as Track | undefined;
  let plan = metadata.plan as "full" | "monthly" | undefined;

  if (!studentId) {
    const code = subscriptionCode(data);
    let query = admin.from("subscriptions").select("student_id,track");
    if (code) query = query.eq("subscription_code", code);
    else if (data?.customer?.customer_code) query = query.eq("customer_code", data.customer.customer_code);
    else return false;
    const { data: subscription } = await query.maybeSingle();
    studentId = subscription?.student_id;
    track = subscription?.track as Track | undefined;
    plan = "monthly";
  }
  if (!studentId || !track) return false;

  const paidAt = new Date(data.paid_at || data.paidAt || Date.now()).toISOString();
  const [{ data: profile }, { data: enrollment }] = await Promise.all([
    admin.from("profiles").select("track,enrollment_date,payment_status").eq("id", studentId).single(),
    admin.from("enrollments").select("enrollment_date").eq("student_id", studentId).eq("track", track).maybeSingle(),
  ]);
  const enrollmentDate = enrollment?.enrollment_date || paidAt;
  const [{ error: enrollmentError }, { error: profileError }, { error: paymentError }] = await Promise.all([
    admin.from("enrollments").upsert({
      student_id: studentId,
      track,
      enrollment_date: enrollmentDate,
      payment_status: "active",
    }, { onConflict: "student_id,track" }),
    admin.from("profiles").update({
      track: profile?.payment_status === "active" ? profile.track : track,
      payment_status: "active",
      enrollment_date: profile?.enrollment_date || enrollmentDate,
    }).eq("id", studentId),
    admin.from("payments").upsert({
      reference: data.reference,
      student_id: studentId,
      amount: Number(data.amount || 0) / 100,
      currency: data.currency || "NGN",
      country_code: metadata.country_code || data.authorization?.country_code || null,
      channel: data.channel || null,
      track,
      plan: plan || "full",
      status: "success",
      paid_at: paidAt,
    }, { onConflict: "reference" }),
  ]);
  if (enrollmentError || profileError || paymentError) throw new Error(enrollmentError?.message || profileError?.message || paymentError?.message);
  await queueStudentNotification(admin, {
    studentId,
    kind: "enrollment_confirmed",
    subject: `Welcome to the ${track} Track`,
    message: `Your payment is confirmed and your ${track} learning room is active. Start with the welcome video, then open your first lesson when you are ready.`,
    link: `${process.env.NEXT_PUBLIC_SITE_URL || "https://learn.beoarts.com"}/dashboard?track=${track}`,
    relatedType: "payment",
    relatedId: data.reference,
    dedupeKey: `enrollment-confirmed:${data.reference}`,
  });
  await deliverDueNotifications(admin, 5);
  return true;
}

export async function recordSubscription(data: any) {
  const admin = paystackAdmin();
  const planCode = data?.plan?.plan_code;
  const email = data?.customer?.email;
  if (!planCode || !email) return false;
  const [{ data: plan }, { data: profile }] = await Promise.all([
    admin.from("paystack_plans").select("track,invoice_limit").eq("plan_code", planCode).maybeSingle(),
    admin.from("profiles").select("id").eq("email", email).maybeSingle(),
  ]);
  if (!plan || !profile) return false;
  const { error } = await admin.from("subscriptions").upsert({
    student_id: profile.id,
    track: plan.track,
    plan_code: planCode,
    subscription_code: data.subscription_code || null,
    customer_code: data.customer?.customer_code || null,
    status: data.status || "active",
    next_payment_date: data.next_payment_date || null,
    invoice_limit: plan.invoice_limit,
    updated_at: new Date().toISOString(),
  }, { onConflict: "student_id,track" });
  if (error) throw new Error(error.message);
  return true;
}

export async function updateSubscriptionStatus(data: any, status: "active" | "past_due" | "complete" | "cancelled") {
  const admin = paystackAdmin();
  const code = data?.subscription_code || subscriptionCode(data);
  if (!code) return false;
  const { data: subscription } = await admin.from("subscriptions").select("student_id,track").eq("subscription_code", code).maybeSingle();
  if (!subscription) return false;
  const profileStatus = status === "active" || status === "complete" ? "active" : "past_due";
  const [{ error: subscriptionError }, { error: enrollmentError }] = await Promise.all([
    admin.from("subscriptions").update({
      status,
      next_payment_date: data?.next_payment_date || data?.subscription?.next_payment_date || null,
      updated_at: new Date().toISOString(),
    }).eq("subscription_code", code),
    admin.from("enrollments").update({ payment_status: profileStatus }).eq("student_id", subscription.student_id).eq("track", subscription.track),
  ]);
  if (subscriptionError || enrollmentError) throw new Error(subscriptionError?.message || enrollmentError?.message);
  const { count: activeCount } = await admin.from("enrollments").select("*", { count: "exact", head: true }).eq("student_id", subscription.student_id).eq("payment_status", "active");
  const { error: profileError } = await admin.from("profiles").update({ payment_status: activeCount ? "active" : profileStatus }).eq("id", subscription.student_id);
  if (profileError) throw new Error(profileError.message);
  if (status === "past_due") {
    await queueStudentNotification(admin, {
      studentId: subscription.student_id,
      kind: "payment_failed",
      subject: `Action needed for your ${subscription.track} payment`,
      message: `Paystack could not complete your latest ${subscription.track} payment. Open Settings to review your subscription and keep your course access active.`,
      link: `${process.env.NEXT_PUBLIC_SITE_URL || "https://learn.beoarts.com"}/settings`,
      relatedType: "subscription",
      relatedId: code,
      dedupeKey: `payment-failed:${code}:${data?.invoice_code || data?.id || new Date().toISOString().slice(0, 10)}`,
    });
    await deliverDueNotifications(admin, 5);
  }
  return true;
}

export async function verifyPaystackTransaction(reference: string) {
  return paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
}

export async function getSubscriptionManageLink(subscriptionCode: string) {
  const data = await paystackRequest(`/subscription/${encodeURIComponent(subscriptionCode)}/manage/link`);
  return data.link as string;
}
