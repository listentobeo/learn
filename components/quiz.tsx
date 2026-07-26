"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { QuizQuestion } from "@/lib/types";

export function Quiz({ questions, lessonCode }: { questions: QuizQuestion[]; lessonCode: string }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(1);
  const complete = useMemo(() => questions.every((q) => answers[q.id]), [answers, questions]);

  async function submit() {
    if (!complete) return toast.error("Choose an answer for each question.");
    const res = await fetch("/api/quiz/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonCode, answers }),
    });
    if (!res.ok) return toast.error("We could not submit your quiz. Please try again.");
    const result = await res.json();
    setScore(result.score);
    setAttempt(result.attempt ?? attempt);
  }

  function retake() {
    setAnswers({});
    setAttempt((current) => current + 1);
    setScore(null);
  }

  if (score !== null) {
    return (
      <div className="quiz surface">
        <div className="eyebrow">Attempt {attempt} complete</div>
        <h2 style={{ fontSize: 35, marginTop: 18 }}>You scored {score} / {questions.length}</h2>
        <p className="subtle">{score === questions.length ? "Excellent observation. You’re ready to put the idea into practice." : "Good work. Revisit the lesson notes before beginning your assignment."}</p>
        <button className="button ghost" type="button" onClick={retake}>Retake quiz</button>
      </div>
    );
  }

  return (
    <section className="quiz surface">
      <h2>Lesson quiz</h2>
      <p className="subtle" style={{ fontSize: 13 }}>Three quick questions. You can retake the quiz whenever you want to improve your score.</p>
      {questions.map((question, index) => (
        <div className="question" key={question.id}>
          <h3>{index + 1}. {question.question_text}</h3>
          <div className="options">
            {(["a", "b", "c", "d"] as const).map((option) => (
              <label className="option" key={option}>
                <input type="radio" name={question.id} value={option} checked={answers[question.id] === option} onChange={() => setAnswers((value) => ({ ...value, [question.id]: option }))} />
                <span>{question[`option_${option}`]}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <button className="button" onClick={submit} disabled={!complete}>Submit quiz</button>
    </section>
  );
}
