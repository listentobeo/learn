import { createClient } from "npm:@supabase/supabase-js@2";

type Track = "Drawing" | "Painting" | "Discovery";
type Payload = {
  student_id?: string;
  track?: Track;
  table?: string;
  record?: { student_id?: string; lesson_code?: string; reviewed?: boolean };
};

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const configuredWebhookSecret = Deno.env.get("COMPLETION_WEBHOOK_SECRET");
  const suppliedWebhookSecret = request.headers.get("x-webhook-secret");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const bearerToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const authorisedByWebhookSecret = Boolean(
    configuredWebhookSecret && suppliedWebhookSecret === configuredWebhookSecret,
  );
  const authorisedByServiceRole = Boolean(
    serviceRoleKey && bearerToken === serviceRoleKey,
  );
  if (!authorisedByWebhookSecret && !authorisedByServiceRole) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = await request.json() as Payload;
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const schoolUrl = Deno.env.get("SCHOOL_APP_URL") || "https://learn.beoarts.com";
  const generationSecret = Deno.env.get("CERTIFICATE_GENERATION_SECRET");
  if (!supabaseUrl || !serviceRoleKey || !generationSecret) return new Response("Function secrets are incomplete", { status: 500 });
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const studentId = payload.student_id || payload.record?.student_id;
  if (!studentId) return new Response("student_id is required", { status: 400 });
  let track = payload.track;
  if (!track && payload.record?.lesson_code) {
    const { data: lesson } = await supabase.from("lessons").select("track").eq("lesson_code", payload.record.lesson_code).single();
    track = lesson?.track as Track | undefined;
  }
  if (!track) return new Response("track could not be resolved", { status: 400 });

  const { data: lessons, error: lessonError } = await supabase.from("lessons").select("lesson_code").eq("track", track);
  if (lessonError) return new Response(lessonError.message, { status: 500 });
  const lessonCodes = (lessons || []).map((lesson) => lesson.lesson_code);
  const [{ data: quizzes }, { data: assignments }, { data: existing }] = await Promise.all([
    supabase.from("quiz_submissions").select("lesson_code").eq("student_id", studentId).in("lesson_code", lessonCodes),
    supabase.from("assignments").select("lesson_code").eq("student_id", studentId).eq("reviewed", true).in("lesson_code", lessonCodes),
    supabase.from("certificates").select("id").eq("student_id", studentId).eq("track", track).maybeSingle(),
  ]);
  const completedQuizzes = new Set((quizzes || []).map((quiz) => quiz.lesson_code)).size;
  const reviewedAssignments = new Set((assignments || []).map((assignment) => assignment.lesson_code)).size;
  if (existing) return Response.json({ complete: true, existing: true });
  if (!lessonCodes.length || completedQuizzes !== lessonCodes.length || reviewedAssignments !== lessonCodes.length) {
    return Response.json({ complete: false, totalLessons: lessonCodes.length, completedQuizzes, reviewedAssignments });
  }

  const response = await fetch(`${schoolUrl}/api/certificate/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-certificate-secret": generationSecret },
    body: JSON.stringify({ student_id: studentId, track }),
  });
  return new Response(await response.text(), { status: response.status, headers: { "Content-Type": "application/json" } });
});
