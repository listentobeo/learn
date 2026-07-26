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
    const score = questions.reduce((total, q) => total + (answers[q.id] === q.correct_answer ? 1 : 0), 0);
    return NextResponse.json({ score, demo: true });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: questions } = await supabase.from("quiz_questions").select("id,correct_answer").eq("lesson_code", lessonCode);
  const score = (questions || []).reduce((total, q) => total + (answers[q.id] === q.correct_answer ? 1 : 0), 0);
  const { count } = await supabase.from("quiz_submissions").select("id", { count: "exact", head: true }).eq("student_id", user.id).eq("lesson_code", lessonCode);
  const attempt = (count || 0) + 1;
  const { error } = await supabase.from("quiz_submissions").insert({ student_id: user.id, lesson_code: lessonCode, answers, score, attempt_number: attempt });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ score, attempt });
}
