import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const payload = z.discriminatedUnion("type", [
  z.object({ type: z.literal("frame"), assignmentId: z.string().uuid(), itemId: z.string().uuid().nullable() }),
  z.object({ type: z.literal("theme"), itemId: z.string().uuid().nullable() }),
  z.object({ type: z.literal("layout"), layout: z.object({ featuredArtworkId: z.string().uuid().nullable(), decorSlots: z.record(z.string(), z.string().uuid()) }) }),
]);

export async function POST(request: Request) {
  const parsed = payload.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid studio selection" }, { status: 400 });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "The Personal Studio requires Supabase" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = parsed.data.type === "frame"
    ? await supabase.rpc("set_assignment_frame", { p_assignment_id: parsed.data.assignmentId, p_item_id: parsed.data.itemId })
    : parsed.data.type === "theme"
      ? await supabase.rpc("set_studio_theme", { p_item_id: parsed.data.itemId })
      : await supabase.rpc("set_studio_layout", { p_layout: parsed.data.layout });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ selection: data });
}
