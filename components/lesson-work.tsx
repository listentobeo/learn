"use client";

import { useState } from "react";
import { AssignmentUpload } from "@/components/assignment-upload";
import { Quiz } from "@/components/quiz";
import type { AssignmentRecord, QuizQuestion } from "@/lib/types";

export function LessonWork({
  questions,
  lessonCode,
  notes,
  instructions,
  initialAssignment,
  initialQuizCompleted,
  whatsappNumber,
  studentName,
}: {
  questions: QuizQuestion[];
  lessonCode: string;
  notes: string;
  instructions: string;
  initialAssignment: AssignmentRecord | null;
  initialQuizCompleted: boolean;
  whatsappNumber?: string;
  studentName: string;
}) {
  const [assignmentUnlocked, setAssignmentUnlocked] = useState(initialQuizCompleted || Boolean(initialAssignment));

  return (
    <div className="lesson-grid">
      <div>
        <section className="surface">
          <h2>Lesson notes</h2>
          <div className="notes">{notes}</div>
        </section>
        <Quiz questions={questions} lessonCode={lessonCode} onContinue={() => setAssignmentUnlocked(true)} />
      </div>
      <AssignmentUpload
        lessonCode={lessonCode}
        instructions={instructions}
        initialAssignment={initialAssignment}
        whatsappNumber={whatsappNumber}
        studentName={studentName}
        quizCompleted={assignmentUnlocked}
      />
    </div>
  );
}
