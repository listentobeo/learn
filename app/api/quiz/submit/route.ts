import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { demoQuestions } from "@/lib/demo-data";

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
    return NextResponse.json({ score: review.filter((item) => item.isCorrect).length, attempt: 1, review, demo: true });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.rpc("submit_lesson_quiz", {
    p_lesson_code: lessonCode,
    p_answers: answers,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
