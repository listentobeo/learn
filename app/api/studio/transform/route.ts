import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const payload = z.object({
  assignmentId: z.string().uuid(),
  wallId: z.enum(["wall-a", "wall-b", "wall-c"]),
  positionX: z.number().min(-1.45).max(1.45),
  positionY: z.number().min(1.25).max(3.75),
  scale: z.number().min(0.55).max(1.65),
  rotationZ: z.number().min(-0.3).max(0.3),
  frameItemId: z.string().uuid().nullable(),
});

export async function POST(request: Request) {
  const parsed = payload.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid studio position" }, { status: 400 });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "The Personal Studio requires Supabase" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const value = parsed.data;
  const { data, error } = await supabase.rpc("save_studio_artwork_transform", {
    p_assignment_id: value.assignmentId,
    p_wall_id: value.wallId,
    p_position_x: value.positionX,
    p_position_y: value.positionY,
    p_scale: value.scale,
    p_rotation_z: value.rotationZ,
    p_frame_item_id: value.frameItemId,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ display: data });
}
