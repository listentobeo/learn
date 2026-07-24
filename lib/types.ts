export type Track = "Drawing" | "Painting" | "Discovery";

export type Lesson = {
  id: string;
  track: Track;
  lesson_code: string;
  title: string;
  youtube_video_id: string | null;
  notes: string;
  assignment_instructions: string;
  week_number: number;
};

export type Profile = {
  id: string;
  name: string;
  email: string;
  track: Track;
  enrollment_date: string | null;
  payment_status: "pending" | "active" | "past_due";
  role: "student" | "admin";
};

export type QuizQuestion = {
  id: string;
  lesson_code: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer?: "a" | "b" | "c" | "d";
};
