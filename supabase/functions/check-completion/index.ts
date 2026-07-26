import { createClient } from "npm:@supabase/supabase-js@2";

type Track = "Drawing" | "Painting" | "Discovery";
type Payload = {
  student_id?: string;
  track?: Track;
  table?: string;
  record?: { student_id?: string; lesson_code?: string; reviewed?: boolean };
};

async function processCompletion(
  payload: Payload,
  config: { supabaseUrl: string; serviceRoleKey: string; schoolUrl: string; generationSecret: string },
) {
  const { supabaseUrl, serviceRoleKey, schoolUrl, generationSecret } = config;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const studentId = payload.student_id || payload.record?.student_id;
  if (!studentId) throw new Error("student_id is required");
  let track = payload.track;
  if (!track && payload.record?.lesson_code) {
    const { data: lesson } = await supabase.from("lessons").select("track").eq("lesson_code", payload.record.lesson_code).single();
    track = lesson?.track as Track | undefined;
  }
  if (!track) throw new Error("track could not be resolved");

  const { data: lessons, error: lessonError } = await supabase.from("lessons").select("lesson_code").eq("track", track);
  if (lessonError) throw lessonError;
  const lessonCodes = (lessons || []).map((lesson) => lesson.lesson_code);
  const [{ data: quizzes }, { data: assignments }, { data: existing }] = await Promise.all([
    supabase.from("quiz_submissions").select("lesson_code").eq("student_id", studentId).in("lesson_code", lessonCodes),
    supabase.from("assignments").select("lesson_code").eq("student_id", studentId).eq("reviewed", true).in("lesson_code", lessonCodes),
    supabase.from("certificates").select("id").eq("student_id", studentId).eq("track", track).maybeSingle(),
  ]);
  const completedQuizzes = new Set((quizzes || []).map((quiz) => quiz.lesson_code)).size;
  const reviewedAssignments = new Set((assignments || []).map((assignment) => assignment.lesson_code)).size;
  if (existing) {
    console.log(JSON.stringify({ event: "certificate_exists", studentId, track }));
    return;
  }
  if (!lessonCodes.length || completedQuizzes !== lessonCodes.length || reviewedAssignments !== lessonCodes.length) {
    console.log(JSON.stringify({
      event: "track_incomplete",
      studentId,
      track,
      totalLessons: lessonCodes.length,
      completedQuizzes,
      reviewedAssignments,
    }));
    return;
  }

  const response = await fetch(`${schoolUrl}/api/certificate/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-certificate-secret": generationSecret },
    body: JSON.stringify({ student_id: studentId, track }),
  });
  const responseBody = await response.text();
  if (!response.ok) throw new Error(`Certificate endpoint failed (${response.status}): ${responseBody}`);
  console.log(JSON.stringify({ event: "certificate_generated", studentId, track }));
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const payload = await request.json() as Payload;
  if (payload.table && payload.table !== "assignments") {
    return new Response("Unsupported webhook table", { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const schoolUrl = Deno.env.get("SCHOOL_APP_URL") || "https://learn.beoarts.com";
  const generationSecret = Deno.env.get("CERTIFICATE_GENERATION_SECRET");
  if (!supabaseUrl || !serviceRoleKey || !generationSecret) {
    return new Response("Function secrets are incomplete", { status: 500 });
  }

  EdgeRuntime.waitUntil(
    processCompletion(payload, { supabaseUrl, serviceRoleKey, schoolUrl, generationSecret })
      .catch((error) => console.error(error instanceof Error ? error.message : error)),
  );
  return Response.json({ accepted: true }, { status: 202 });
});
