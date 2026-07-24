import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const statusFields = "id,lesson_code,submitted_at,seen_at,reviewed,reviewed_at,feedback,feedback_at";

export async function GET(request: Request) {
  const lessonCode = new URL(request.url).searchParams.get("lessonCode");
  if (!lessonCode) return NextResponse.json({ error: "Lesson code is required" }, { status: 400 });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ assignment: null, demo: true });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.from("assignments").select(statusFields).eq("student_id", user.id).eq("lesson_code", lessonCode).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ assignment: data });
}

async function notifyBenjamin(studentName: string, lessonCode: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const recipient = process.env.BENJAMIN_WHATSAPP_NUMBER;
  if (token && phoneId && recipient) {
    await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: recipient, type: "text", text: { body: `New Beo assignment: ${studentName} submitted ${lessonCode}. Open the admin dashboard to review.` } }),
    });
    return;
  }
  const resendKey = process.env.RESEND_API_KEY;
  const email = process.env.BENJAMIN_EMAIL;
  if (resendKey && email) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Beo School <notifications@learn.beoarts.com>", to: email, subject: `Assignment submitted · ${lessonCode}`, html: `<p>${studentName} submitted work for ${lessonCode}.</p>` }),
    });
  }
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const lessonCode = String(form.get("lessonCode") || "");
  if (!(file instanceof File) || !lessonCode || !file.type.startsWith("image/") || file.size > 10_000_000) {
    return NextResponse.json({ error: "Please upload an image under 10 MB" }, { status: 400 });
  }
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ assignment: { id: "demo", lesson_code: lessonCode, submitted_at: new Date().toISOString(), seen_at: null, reviewed: false, reviewed_at: null, feedback: null, feedback_at: null }, demo: true });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${user.id}/${lessonCode}-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from("assignments").upload(path, file, { contentType: file.type });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });
  const { data: signed } = await supabase.storage.from("assignments").createSignedUrl(path, 60 * 60 * 24 * 7);
  const { data: assignment, error } = await supabase.from("assignments").insert({ student_id: user.id, lesson_code: lessonCode, file_path: path, file_url: signed?.signedUrl || path }).select(statusFields).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).single();
  try {
    await notifyBenjamin(profile?.name || user.email || "A student", lessonCode);
  } catch {
    // The submission remains valid even if the external notification provider is unavailable.
  }
  return NextResponse.json({ assignment });
}
