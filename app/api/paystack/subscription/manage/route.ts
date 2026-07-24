import { NextResponse } from "next/server";
import { z } from "zod";
import { getSubscriptionManageLink } from "@/lib/paystack";
import { createClient } from "@/lib/supabase/server";

const trackSchema = z.enum(["Drawing", "Painting"]);

export async function GET(request: Request) {
  const parsed = trackSchema.safeParse(new URL(request.url).searchParams.get("track"));
  if (!parsed.success) return NextResponse.json({ error: "Invalid subscription track." }, { status: 400 });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Payment management is not configured." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: subscription } = await supabase.from("subscriptions").select("subscription_code").eq("student_id", user.id).eq("track", parsed.data).not("subscription_code", "is", null).maybeSingle();
  if (!subscription?.subscription_code) return NextResponse.json({ error: "No recurring subscription was found for this course." }, { status: 404 });
  try {
    const url = await getSubscriptionManageLink(subscription.subscription_code);
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to open subscription management." }, { status: 502 });
  }
}
