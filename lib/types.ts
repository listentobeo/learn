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
  phone?: string | null;
  parent_name?: string | null;
  parent_email?: string | null;
  email_notifications?: boolean;
  whatsapp_notifications?: boolean;
};

export type Enrollment = {
  student_id: string;
  track: Track;
  enrollment_date: string;
  payment_status: "pending" | "active" | "past_due";
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
  correct_answer_text?: string;
};

export type AssignmentRecord = {
  id: string;
  lesson_code: string;
  submitted_at: string;
  seen_at: string | null;
  reviewed: boolean;
  reviewed_at: string | null;
  feedback: string | null;
  feedback_at: string | null;
};

export type TrackWelcomeVideo = {
  track: Track;
  title: string;
  youtube_video_id: string | null;
  description: string;
};

export type Certificate = {
  id: string;
  student_id: string;
  track: Track;
  file_url: string;
  certificate_code: string;
  issued_at: string;
};
