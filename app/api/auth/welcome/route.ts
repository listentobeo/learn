import { NextResponse } from "next/server";
import { deliverDueNotifications, queueStudentNotification } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ demo: true });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Email service is not configured" }, { status: 503 });

  const { data: profile, error } = await admin
    .from("profiles")
    .select("name,track")
    .eq("id", user.id)
    .single();
  if (error || !profile) {
    return NextResponse.json({ error: "Student profile was not found" }, { status: 404 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://learn.beoarts.com";
  await queueStudentNotification(admin, {
    studentId: user.id,
    kind: "welcome",
    subject: `Welcome to Beo School of Art, ${profile.name.trim().split(/\s+/)[0] || profile.name}`,
    message: `Welcome to Beo School of Art Vol. 1.\n\nYour student account has been created for the ${profile.track} Track. Complete your enrollment to enter the course, watch your welcome video, and begin your lessons.\n\nIf you need help at any point, contact support@beoarts.com.`,
    link: `${siteUrl}/checkout?track=${profile.track}`,
    relatedType: "profile",
    relatedId: user.id,
    dedupeKey: `welcome:${user.id}`,
  });
  const deliveries = await deliverDueNotifications(admin, 10);

  return NextResponse.json({ queued: true, deliveries });
}
