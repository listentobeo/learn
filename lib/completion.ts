import type { SupabaseClient } from "@supabase/supabase-js";
import type { Track } from "@/lib/types";

export type TrackCompletion = {
  track: Track;
  totalLessons: number;
  completedQuizzes: number;
  reviewedAssignments: number;
  complete: boolean;
};

export async function getTrackCompletion(
  supabase: SupabaseClient,
  studentId: string,
  track: Track,
): Promise<TrackCompletion> {
  const { data: lessons, error: lessonError } = await supabase
    .from("lessons")
    .select("lesson_code")
    .eq("track", track)
    .order("week_number");
  if (lessonError) throw lessonError;
  const lessonCodes = (lessons || []).map((lesson) => lesson.lesson_code);
  if (!lessonCodes.length) return { track, totalLessons: 0, completedQuizzes: 0, reviewedAssignments: 0, complete: false };

  const [{ data: quizzes, error: quizError }, { data: assignments, error: assignmentError }] = await Promise.all([
    supabase.from("quiz_submissions").select("lesson_code").eq("student_id", studentId).in("lesson_code", lessonCodes),
    supabase.from("assignments").select("lesson_code").eq("student_id", studentId).eq("reviewed", true).in("lesson_code", lessonCodes),
  ]);
  if (quizError) throw quizError;
  if (assignmentError) throw assignmentError;

  const completedQuizzes = new Set((quizzes || []).map((quiz) => quiz.lesson_code)).size;
  const reviewedAssignments = new Set((assignments || []).map((assignment) => assignment.lesson_code)).size;
  const totalLessons = lessonCodes.length;
  return {
    track,
    totalLessons,
    completedQuizzes,
    reviewedAssignments,
    complete: totalLessons > 0 && completedQuizzes === totalLessons && reviewedAssignments === totalLessons,
  };
}
