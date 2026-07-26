import { NextResponse } from "next/server";
import { issueCertificate } from "@/lib/certificates";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Track } from "@/lib/types";

export async function POST() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured in Vercel" }, { status: 503 });
  const { data: checks, error } = await admin
    .from("completion_checks")
    .select("id,student_id,track")
    .is("processed_at", null)
    .order("created_at")
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const groups = new Map<string, { studentId: string; track: Track; ids: string[] }>();
  for (const check of checks || []) {
    const key = `${check.student_id}:${check.track}`;
    const group: { studentId: string; track: Track; ids: string[] } = groups.get(key) || {
      studentId: check.student_id,
      track: check.track as Track,
      ids: [],
    };
    group.ids.push(check.id);
    groups.set(key, group);
  }

  const results: Array<{ studentId: string; track: Track; certificateCode?: string; complete?: boolean; error?: string }> = [];
  for (const group of groups.values()) {
    try {
      const result = await issueCertificate(admin, group.studentId, group.track);
      await admin.from("completion_checks").update({
        processed_at: new Date().toISOString(),
        certificate_id: result.certificate?.id || null,
        error: null,
      }).in("id", group.ids);
      results.push({
        studentId: group.studentId,
        track: group.track,
        certificateCode: result.certificate?.certificate_code,
        complete: result.complete,
      });
    } catch (completionError) {
      const message = completionError instanceof Error ? completionError.message : "Unknown completion error";
      await admin.from("completion_checks").update({ error: message.slice(0, 2000) }).in("id", group.ids);
      results.push({ studentId: group.studentId, track: group.track, error: message });
    }
  }

  return NextResponse.json({
    processed: groups.size,
    certificates: results.filter((result) => result.certificateCode).length,
    failed: results.filter((result) => result.error).length,
    results,
  });
}
