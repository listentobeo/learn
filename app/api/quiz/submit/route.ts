import { after, NextResponse } from "next/server";
import { z } from "zod";
import { issueCertificate } from "@/lib/certificates";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { demoQuestions } from "@/lib/demo-data";
import type { Track } from "@/lib/types";

const payload = z.object({
  lessonCode: z.string().min(1).max(12),
  answers: z.record(z.string(), z.enum(["a", "b", "c", "d"])),
});

export async function POST(request: Request) {
  const parsed = payload.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  const supabase = await createClient();
  const { lessonCode, answers } = parsed.data;
  if (!supabase) {
    const questions = demoQuestions(lessonCode);
    if (questions.some((question) => !answers[question.id])) return NextResponse.json({ error: "Answer every quiz question before submitting" }, { status: 400 });
    const review = questions.map((question) => ({
      questionId: question.id,
      selectedAnswer: answers[question.id],
      correctAnswer: question.correct_answer,
      isCorrect: answers[question.id] === question.correct_answer,
      explanation: "",
    }));
    const score = review.filter((item) => item.isCorrect).length;
    return NextResponse.json({ score, attempt: 1, review, gameRewards: [{ label: "Knowledge check complete", xp: 20, brushes: 5 }, ...(score === 3 ? [{ label: "Full-score mastery", xp: 20, brushes: 7 }] : [])], demo: true });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [{ data: priorSubmissions, error: priorError }, { data: rewardSetting }] = await Promise.all([
    supabase.from("quiz_submissions").select("score").eq("student_id", user.id).eq("lesson_code", lessonCode),
    supabase.from("gamification_settings").select("enabled").eq("id", true).maybeSingle(),
  ]);
  if (priorError) return NextResponse.json({ error: priorError.message }, { status: 400 });
  const { data, error } = await supabase.rpc("submit_lesson_quiz", {
    p_lesson_code: lessonCode,
    p_answers: answers,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  after(async () => {
    const admin = createAdminClient();
    if (!admin) return;
    const { data: lesson } = await admin.from("lessons").select("track").eq("lesson_code", lessonCode).single();
    if (!lesson?.track) return;
    try {
      await issueCertificate(admin, user.id, lesson.track as Track);
    } catch {
      // The database completion queue remains available for the scheduled retry.
    }
  });
  const result = data as { attempt?: number; score?: number };
  const prior = priorSubmissions || [];
  const gameRewards: Array<{ label: string; xp: number; brushes: number }> = [];
  if (rewardSetting?.enabled !== false && !prior.length) gameRewards.push({ label: "Knowledge check complete", xp: 20, brushes: 5 });
  if (rewardSetting?.enabled !== false && result.score === 3 && !prior.some((row) => row.score === 3)) {
    gameRewards.push({ label: "Full-score mastery", xp: 20, brushes: 7 });
    if (prior.some((row) => row.score < 3)) gameRewards.push({ label: "Corrections mastered", xp: 10, brushes: 3 });
  }
  return NextResponse.json({ ...result, gameRewards });
}
