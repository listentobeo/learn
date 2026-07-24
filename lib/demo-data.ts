import type { Lesson, Profile, QuizQuestion, Track } from "./types";

const names: Record<Track, string[]> = {
  Discovery: [
    "The Artist’s Eye",
    "Lines, Shapes & Edges",
    "Light and Shadow",
    "Drawing What You See",
    "Finding Your Visual Voice",
    "Colour Without Fear",
    "Your First Finished Piece",
  ],
  Drawing: [
    "Learning to See",
    "Line, Gesture & Rhythm",
    "Shape and Structure",
    "Form Through Light",
    "Perspective Essentials",
    "Still Life Foundations",
    "Portrait Proportions",
    "Features of the Face",
    "Figure and Gesture",
    "Texture and Detail",
    "Composition in Drawing",
    "The Finished Drawing",
  ],
  Painting: [
    "Your Painting Practice",
    "Colour, Value & Temperature",
    "Brushwork and Paint Control",
    "Studio Study: Limited Palette",
    "From Drawing to Painting",
    "Mixing Natural Colour",
    "Painting Light",
    "Edges and Atmosphere",
    "Still Life in Colour",
    "The Painted Portrait",
    "Composition and Story",
    "Developing a Personal Language",
    "The Final Painting",
  ],
};

function codes(track: Track) {
  if (track === "Discovery") return names[track].map((_, i) => `D${i + 1}`);
  if (track === "Drawing") return names[track].map((_, i) => `DR${i + 1}`);
  return ["P1", "P2", "P3", "P3.5", "P4", "P5", "P6", "P7", "P8", "P9", "P10", "P11", "P12"];
}

export function lessonsFor(track: Track): Lesson[] {
  return names[track].map((title, i) => ({
    id: `${track}-${i + 1}`,
    track,
    lesson_code: codes(track)[i],
    title,
    youtube_video_id: null,
    notes:
      "In this lesson, you will slow down and observe before making marks. Keep your tools simple and work from direct observation.\n\nFocus on relationships rather than isolated details. Compare angles, distances, and values throughout your study. Your first marks should stay light and adjustable.",
    assignment_instructions:
      "Create one focused study using the method demonstrated in this lesson. Photograph your work in even daylight, with the full page visible.",
    week_number: i + 1,
  }));
}

export const demoProfile: Profile = {
  id: "demo-student",
  name: "Amara Okafor",
  email: "amara@example.com",
  track: "Drawing",
  enrollment_date: new Date(Date.now() - 16 * 86400000).toISOString(),
  payment_status: "active",
  role: "student",
};

export function demoQuestions(lessonCode: string): QuizQuestion[] {
  return [
    {
      id: `${lessonCode}-q1`,
      lesson_code: lessonCode,
      question_text: "What should guide your first marks in an observational drawing?",
      option_a: "Small decorative details",
      option_b: "Large shapes and overall relationships",
      option_c: "The darkest shadows only",
      option_d: "A memorised formula",
      correct_answer: "b",
    },
    {
      id: `${lessonCode}-q2`,
      lesson_code: lessonCode,
      question_text: "Why are light initial lines useful?",
      option_a: "They are easier to adjust as the drawing develops",
      option_b: "They make every subject look realistic",
      option_c: "They remove the need to measure",
      option_d: "They create automatic texture",
      correct_answer: "a",
    },
    {
      id: `${lessonCode}-q3`,
      lesson_code: lessonCode,
      question_text: "Which habit improves accurate observation most?",
      option_a: "Looking only at the paper",
      option_b: "Drawing each object from memory",
      option_c: "Frequently comparing the drawing with the subject",
      option_d: "Finishing one detail before everything else",
      correct_answer: "c",
    },
  ];
}

export const demoStudents = [
  { id: "1", name: "Amara Okafor", email: "amara@example.com", track: "Drawing", lesson: "DR3", score: "3/3", status: "Awaiting review" },
  { id: "2", name: "Tobi Adeyemi", email: "tobi@example.com", track: "Painting", lesson: "P2", score: "2/3", status: "Reviewed" },
  { id: "3", name: "Nneka Eze", email: "nneka@example.com", track: "Discovery", lesson: "D7", score: "3/3", status: "Awaiting review" },
  { id: "4", name: "Femi Balogun", email: "femi@example.com", track: "Drawing", lesson: "DR5", score: "2/3", status: "No submission" },
  { id: "5", name: "Zainab Bello", email: "zainab@example.com", track: "Painting", lesson: "P3.5", score: "3/3", status: "Awaiting review" },
];
