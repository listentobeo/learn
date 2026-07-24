import { ArrowRight, Lock } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { demoProfile, lessonsFor } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import type { Lesson, Profile } from "@/lib/types";
import { formatDate, isLessonUnlocked } from "@/lib/utils";

async function dashboardData(): Promise<{ profile: Profile; lessons: Lesson[] }> {
  const supabase = await createClient();
  if (!supabase) return { profile: demoProfile, lessons: lessonsFor(demoProfile.track) };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { profile: demoProfile, lessons: lessonsFor(demoProfile.track) };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const activeProfile = profile as Profile;
  const { data: lessons } = await supabase.from("lessons").select("*").eq("track", activeProfile.track).order("week_number");
  return { profile: activeProfile, lessons: (lessons || []) as Lesson[] };
}

export default async function DashboardPage() {
  const { profile, lessons } = await dashboardData();
  const unlocked = lessons.filter((lesson) => isLessonUnlocked(lesson, profile));
  const current = unlocked.at(-1);
  const progress = lessons.length ? Math.round((unlocked.length / lessons.length) * 100) : 0;

  return (
    <AppShell name={profile.name} track={profile.track}>
      <div className="dash-head">
        <div><span className="subtle">Good to see you,</span><h1>{profile.name.split(" ")[0]}.</h1></div>
        <span className="pill">● Enrollment active</span>
      </div>
      <section className="progress-card">
        <div><h2>{profile.track} Guided</h2><p>Enrolled {formatDate(profile.enrollment_date)} · Current lesson {current?.lesson_code || "—"}</p></div>
        <span className="progress-value">{progress}%</span>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
      </section>
      <div className="content-title"><h2>Your lessons</h2><span>{unlocked.length} of {lessons.length} available</span></div>
      <div className="lesson-list">
        {lessons.map((lesson) => {
          const open = isLessonUnlocked(lesson, profile);
          return open ? (
            <Link className="lesson-row open" href={`/lesson/${lesson.lesson_code}`} key={lesson.lesson_code}>
              <span className="lesson-index">{lesson.lesson_code}</span><div><h3>{lesson.title}</h3><p>{lesson === current ? "Continue your current lesson" : "Lesson available"}</p></div><span className="lesson-action"><ArrowRight size={16} /></span>
            </Link>
          ) : (
            <div className="lesson-row locked" key={lesson.lesson_code}>
              <span className="lesson-index">{lesson.lesson_code}</span><div><h3>{lesson.title}</h3><p>Unlocks in week {lesson.week_number}</p></div><span className="lesson-action"><Lock size={14} /></span>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
