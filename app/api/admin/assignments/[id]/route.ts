import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ demo: true });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const action = body.action || "complete";
  const feedback = typeof body.feedback === "string" ? body.feedback.trim().slice(0, 5000) : "";
  const now = new Date().toISOString();
  const updates = action === "seen"
    ? { seen_at: now }
    : action === "feedback"
      ? { feedback: feedback || null, feedback_at: feedback ? now : null, seen_at: now }
      : { reviewed: true, reviewed_at: now, seen_at: now, feedback: feedback || null, feedback_at: feedback ? now : null };
  const { data, error } = await supabase.from("assignments").update(updates).eq("id", id).select("id,seen_at,reviewed,reviewed_at,feedback,feedback_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ assignment: data });
}
