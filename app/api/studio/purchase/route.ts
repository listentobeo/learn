import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const payload = z.object({ itemId: z.string().uuid() });

export async function POST(request: Request) {
  const parsed = payload.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid studio item" }, { status: 400 });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "The Reward Shop requires Supabase" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.rpc("purchase_studio_item", { p_item_id: parsed.data.itemId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
