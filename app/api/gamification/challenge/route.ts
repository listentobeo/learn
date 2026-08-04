import { NextResponse } from "next/server";
import { z } from "zod";
import { awardGamificationEvent } from "@/lib/gamification";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const payload = z.object({
  challengeId: z.string().uuid(),
  answer: z.union([z.string().max(100), z.array(z.string().max(100)).max(20), z.record(z.string(), z.string())]),
});

function sameAnswer(expected: unknown, supplied: unknown) {
  if (Array.isArray(expected) && Array.isArray(supplied)) return JSON.stringify(expected) === JSON.stringify(supplied);
  if (expected && supplied && typeof expected === "object" && typeof supplied === "object") {
    const ordered = (value: object) => Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
    return JSON.stringify(ordered(expected)) === JSON.stringify(ordered(supplied));
  }
  return String(expected) === String(supplied);
}

export async function POST(request: Request) {
  const parsed = payload.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid Studio Challenge response" }, { status: 400 });
  const supabase = await createClient();
  const admin = createAdminClient();
  if (!supabase || !admin) return NextResponse.json({ error: "Studio Challenges require the live school database" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: challenge, error: challengeError } = await admin
    .from("lesson_game_challenges")
    .select("id,lesson_code,version,challenge_config,explanation,reward_xp,reward_brushes,is_mastery,lessons(track,week_number)")
    .eq("id", parsed.data.challengeId)
    .eq("approved", true)
    .eq("active", true)
    .single();
  if (challengeError || !challenge) return NextResponse.json({ error: "Studio Challenge is unavailable" }, { status: 404 });

  const lessonRelation = challenge.lessons as unknown as { track: string; week_number: number } | { track: string; week_number: number }[];
  const lesson = Array.isArray(lessonRelation) ? lessonRelation[0] : lessonRelation;
  const { data: enrollment } = await admin.from("enrollments").select("enrollment_date").eq("student_id", user.id).eq("track", lesson.track).eq("payment_status", "active").maybeSingle();
  if (!enrollment) return NextResponse.json({ error: "This challenge is not part of an active enrollment" }, { status: 403 });
  if (lesson.track !== "Discovery") {
    const unlocksAt = new Date(enrollment.enrollment_date);
    unlocksAt.setUTCDate(unlocksAt.getUTCDate() + (lesson.week_number - 1) * 7);
    if (unlocksAt.getTime() > Date.now()) return NextResponse.json({ error: "This lesson has not unlocked yet" }, { status: 403 });
  }

  const config = (challenge.challenge_config || {}) as Record<string, unknown>;
  const expected = config.correct_answer ?? config.correct_order ?? config.matches;
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count: recentAttempts } = await admin.from("game_attempts").select("id", { count: "exact", head: true }).eq("student_id", user.id).gte("completed_at", oneMinuteAgo);
  if ((recentAttempts || 0) >= 10) return NextResponse.json({ error: "Take a moment to review the lesson idea before trying again." }, { status: 429 });
  const isCorrect = sameAnswer(expected, parsed.data.answer);
  const { count: previousAttempts } = await admin.from("game_attempts").select("id", { count: "exact", head: true }).eq("student_id", user.id).eq("challenge_id", challenge.id);
  const { count: previousWrong } = await admin.from("game_attempts").select("id", { count: "exact", head: true }).eq("student_id", user.id).eq("challenge_id", challenge.id).eq("is_correct", false);
  const { data: attempt, error: attemptError } = await admin.from("game_attempts").insert({
    student_id: user.id,
    challenge_id: challenge.id,
    challenge_version: challenge.version,
    attempt_number: (previousAttempts || 0) + 1,
    submitted_response: parsed.data.answer,
    is_correct: isCorrect,
    correction_completed: isCorrect && Boolean(previousWrong),
  }).select("id,attempt_number").single();
  if (attemptError) return NextResponse.json({ error: attemptError.message }, { status: 400 });

  let reward = null;
  let correctionReward = null;
  if (isCorrect) {
    reward = await awardGamificationEvent(admin, {
      studentId: user.id,
      eventType: challenge.is_mastery ? "mastery_challenge" : "studio_challenge",
      relatedType: "challenge",
      relatedId: challenge.id,
      xp: challenge.reward_xp,
      brushes: challenge.reward_brushes,
      dedupeKey: `challenge-complete:${user.id}:${challenge.id}`,
      metadata: { lesson_code: challenge.lesson_code, version: challenge.version },
    });
    if (previousWrong) {
      correctionReward = await awardGamificationEvent(admin, {
        studentId: user.id,
        eventType: "correction_completed",
        relatedType: "challenge",
        relatedId: challenge.id,
        xp: 10,
        brushes: 3,
        dedupeKey: `challenge-correction:${user.id}:${challenge.id}`,
        metadata: { lesson_code: challenge.lesson_code },
      });
    }
  }

  return NextResponse.json({
    correct: isCorrect,
    attempt: attempt.attempt_number,
    explanation: challenge.explanation,
    correctAnswer: isCorrect ? undefined : expected,
    reward,
    correctionReward,
  });
}
