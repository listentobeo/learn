import type { Lesson, Profile } from "./types";

export function isLessonUnlocked(lesson: Lesson, profile: Profile) {
  if (profile.payment_status !== "active" || !profile.enrollment_date) return false;
  if (profile.track === "Discovery") return true;
  const elapsed = Date.now() - new Date(profile.enrollment_date).getTime();
  const unlockedWeek = Math.floor(elapsed / (7 * 24 * 60 * 60 * 1000)) + 1;
  return lesson.week_number <= unlockedWeek;
}

export function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function formatDate(date: string | null) {
  if (!date) return "Not enrolled";
  return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
}
