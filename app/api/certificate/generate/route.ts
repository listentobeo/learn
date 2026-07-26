import { NextResponse } from "next/server";
import { z } from "zod";
import { issueCertificate } from "@/lib/certificates";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const payload = z.object({
  student_id: z.string().uuid(),
  track: z.enum(["Drawing", "Painting", "Discovery"]),
});

async function authorised(request: Request) {
  const configuredSecret = process.env.CERTIFICATE_GENERATION_SECRET;
  const suppliedSecret = request.headers.get("x-certificate-secret");
  if (configuredSecret && suppliedSecret === configuredSecret) return true;
  const supabase = await createClient();
  if (!supabase) return process.env.NODE_ENV !== "production";
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return data?.role === "admin";
}

export async function POST(request: Request) {
  if (!await authorised(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = payload.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid certificate request" }, { status: 400 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Supabase service role is not configured" }, { status: 503 });
  try {
    const result = await issueCertificate(admin, parsed.data.student_id, parsed.data.track);
    if (!result.complete) return NextResponse.json({ error: "The student has not completed every quiz and reviewed assignment in this track" }, { status: 409 });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Certificate generation failed" }, { status: 500 });
  }
}
