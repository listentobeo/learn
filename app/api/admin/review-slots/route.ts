import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const payload = z.object({
  startsAt: z.string().datetime(),
  durationMinutes: z.number().int().min(15).max(120),
});

export async function POST(request: Request) {
  const parsed = payload.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid review time" }, { status: 400 });
  const startsAt = new Date(parsed.data.startsAt);
  if (startsAt.getTime() <= Date.now()) return NextResponse.json({ error: "Review time must be in the future" }, { status: 400 });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Live scheduling requires Supabase" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const endsAt = new Date(startsAt.getTime() + parsed.data.durationMinutes * 60_000);
  const { count: overlapping } = await supabase
    .from("review_slots")
    .select("id", { count: "exact", head: true })
    .lt("starts_at", endsAt.toISOString())
    .gt("ends_at", startsAt.toISOString());
  if (overlapping) return NextResponse.json({ error: "This time overlaps another review slot" }, { status: 409 });
  const { data, error } = await supabase.from("review_slots").insert({ starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), created_by: user.id }).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ slot: data });
}
