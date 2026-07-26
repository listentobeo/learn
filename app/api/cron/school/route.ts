import { NextResponse } from "next/server";
import { issueCertificate } from "@/lib/certificates";
import { deliverDueNotifications, enqueueSchoolReminders } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Track } from "@/lib/types";

function authorised(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function GET(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Supabase service role is not configured" }, { status: 503 });

  const { data: checks, error } = await admin
    .from("completion_checks")
    .select("id,student_id,track")
    .is("processed_at", null)
    .order("created_at")
    .limit(25);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let certificateChecks = 0;
  for (const check of checks || []) {
    try {
      const result = await issueCertificate(admin, check.student_id, check.track as Track);
      await admin.from("completion_checks").update({
        processed_at: new Date().toISOString(),
        certificate_id: result.certificate?.id || null,
        error: null,
      }).eq("id", check.id);
      certificateChecks += 1;
    } catch (completionError) {
      await admin.from("completion_checks").update({
        error: completionError instanceof Error ? completionError.message.slice(0, 2000) : "Unknown completion error",
      }).eq("id", check.id);
    }
  }

  await enqueueSchoolReminders(admin);
  const deliveries = await deliverDueNotifications(admin);
  return NextResponse.json({ completionChecks: certificateChecks, deliveries });
}
