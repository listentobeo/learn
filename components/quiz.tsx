"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { QuizQuestion } from "@/lib/types";

type AnswerKey = "a" | "b" | "c" | "d";
type ReviewItem = {
  questionId: string;
  selectedAnswer: AnswerKey;
  correctAnswer: AnswerKey;
  isCorrect: boolean;
  explanation: string;
};

export function Quiz({
  questions,
  lessonCode,
  onContinue,
}: {
  questions: QuizQuestion[];
  lessonCode: string;
  onContinue: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(1);
  const [review, setReview] = useState<ReviewItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const complete = useMemo(() => questions.every((question) => answers[question.id]), [answers, questions]);

  function answerText(question: QuizQuestion, answer: AnswerKey) {
    return question[`option_${answer}`];
  }

  async function submit() {
    if (!complete) return toast.error("Choose an answer for each question.");
    setSubmitting(true);
    try {
      const response = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonCode, answers }),
      });
      const result = await response.json();
      if (!response.ok) return toast.error(result.error || "We could not submit your quiz. Please try again.");
      setScore(result.score);
      setAttempt(result.attempt ?? attempt);
      setReview(result.review || []);
    } catch {
      toast.error("Your connection changed while submitting. Check your network and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function retake() {
    setAnswers({});
    setScore(null);
    setReview([]);
  }

  if (score !== null) {
    return (
      <section className="quiz surface">
        <div className="eyebrow">Attempt {attempt} complete</div>
        <h2 style={{ fontSize: 35, marginTop: 18 }}>You scored {score} / {questions.length}</h2>
        <p className="subtle">{score === questions.length ? "Excellent work. Every answer is correct." : "Review each correction below. You can retake the quiz or continue when the answers make sense."}</p>
        <div className="quiz-review">
          {questions.map((question, index) => {
            const result = review.find((item) => item.questionId === question.id);
            if (!result) return null;
            return (
              <div className={`quiz-review-item ${result.isCorrect ? "correct" : "wrong"}`} key={question.id}>
                <div className="quiz-review-title">
                  {result.isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                  <strong>{index + 1}. {question.question_text}</strong>
                </div>
                <p><span>Your answer:</span> {result.selectedAnswer.toUpperCase()}. {answerText(question, result.selectedAnswer)}</p>
                {!result.isCorrect && (
                  <>
                    <p className="correct-answer"><span>Correct answer:</span> {result.correctAnswer.toUpperCase()}. {answerText(question, result.correctAnswer)}</p>
                    {result.explanation && <p className="answer-explanation"><span>Why:</span> {result.explanation}</p>}
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div className="quiz-actions">
          <button className="button ghost" type="button" onClick={retake}>Retake quiz</button>
          <button className="button" type="button" onClick={onContinue}>Continue to assignment</button>
        </div>
      </section>
    );
  }

  return (
    <section className="quiz surface">
      <h2>Lesson quiz</h2>
      <p className="subtle" style={{ fontSize: 13 }}>Three quick questions. After submitting, you’ll see corrections for anything you missed.</p>
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
      <button className="button" onClick={submit} disabled={!complete || submitting}>{submitting ? "Checking answers…" : "Submit quiz"}</button>
    </section>
  );
}
