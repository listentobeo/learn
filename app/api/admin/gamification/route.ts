import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { awardGamificationEvent } from "@/lib/gamification";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("toggle"), enabled: z.boolean() }),
  z.object({ action: z.literal("catalog"), itemId: z.string().uuid(), price: z.number().int().min(0).max(100000), minimumLevel: z.number().int().min(1).max(99), active: z.boolean() }),
  z.object({ action: z.literal("award"), studentId: z.string().uuid(), xp: z.number().int().min(0).max(10000), brushes: z.number().int().min(0).max(10000), reason: z.string().trim().min(3).max(240) }),
]);

async function authorizedAdmin() {
  const client = await createClient();
  if (!client) return { error: NextResponse.json({ error: "Supabase is not configured" }, { status: 503 }) };
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: profile } = await client.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  const admin = createAdminClient();
  if (!admin) return { error: NextResponse.json({ error: "Service role is not configured" }, { status: 503 }) };
  return { admin, user };
}

export async function PATCH(request: Request) {
  const auth = await authorizedAdmin();
  if ("error" in auth) return auth.error;
  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });
  const input = parsed.data;
  if (input.action === "award" && input.xp === 0 && input.brushes === 0) return NextResponse.json({ error: "Enter XP or Gold Brushes" }, { status: 400 });

  if (input.action === "toggle") {
    const { error } = await auth.admin.from("gamification_settings").update({ enabled: input.enabled, updated_at: new Date().toISOString(), updated_by: auth.user.id }).eq("id", true);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else if (input.action === "catalog") {
    const { error } = await auth.admin.from("studio_catalog_items").update({ price: input.price, minimum_level: input.minimumLevel, active: input.active, updated_at: new Date().toISOString() }).eq("id", input.itemId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    try {
      await awardGamificationEvent(auth.admin, {
        studentId: input.studentId,
        eventType: "admin_award",
        relatedType: "admin",
        relatedId: auth.user.id,
        xp: input.xp,
        brushes: input.brushes,
        dedupeKey: `admin-award:${randomUUID()}`,
        metadata: { reason: input.reason, awarded_by: auth.user.id },
      });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Reward could not be awarded" }, { status: 400 });
    }
  }
  return NextResponse.json({ ok: true });
}
