"use client";

import { useState } from "react";
import { AssignmentUpload } from "@/components/assignment-upload";
import { Quiz } from "@/components/quiz";
import { StudioChallenge } from "@/components/studio-challenge";
import type { AssignmentRecord, QuizQuestion, StudioChallenge as StudioChallengeType } from "@/lib/types";

export function LessonWork({
  questions,
  lessonCode,
  notes,
  instructions,
  initialAssignment,
  initialQuizCompleted,
  challenge,
  demo = false,
}: {
  questions: QuizQuestion[];
  lessonCode: string;
  notes: string;
  instructions: string;
  initialAssignment: AssignmentRecord | null;
  initialQuizCompleted: boolean;
  challenge: StudioChallengeType | null;
  demo?: boolean;
}) {
  const [assignmentUnlocked, setAssignmentUnlocked] = useState(initialQuizCompleted || Boolean(initialAssignment));

  return (
    <div className="lesson-grid">
      <div>
        <section className="surface">
          <h2>Lesson notes</h2>
          <div className="notes">{notes}</div>
        </section>
        {challenge && <StudioChallenge challenge={challenge} demo={demo} />}
        <Quiz questions={questions} lessonCode={lessonCode} onContinue={() => setAssignmentUnlocked(true)} />
      </div>
      <AssignmentUpload
        lessonCode={lessonCode}
        instructions={instructions}
        initialAssignment={initialAssignment}
        quizCompleted={assignmentUnlocked}
      />
    </div>
  );
}
