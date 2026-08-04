import { ArrowRight, Coins, Flame, Frame, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { CertificateCard } from "@/components/certificate-card";
import { WelcomeVideo } from "@/components/welcome-video";
import { demoProfile, lessonsFor } from "@/lib/demo-data";
import { demoGameProfile, fallbackArtistLevels, getGamificationSummary, levelProgress } from "@/lib/gamification";
import { createClient } from "@/lib/supabase/server";
import type { ArtistLevel, Certificate, Enrollment, GamificationProfile, Lesson, Profile, Track, TrackWelcomeVideo } from "@/lib/types";
import { formatDate, isLessonUnlocked } from "@/lib/utils";

function defaultWelcome(profile: Profile): TrackWelcomeVideo {
  return {
    track: profile.track,
    title: `Welcome to ${profile.track}${profile.track === "Discovery" ? "" : " Guided"}`,
    youtube_video_id: null,
    description: "Begin here for an introduction to your track and the learning rhythm.",
  };
}

type DashboardData = { profile: Profile; lessons: Lesson[]; welcomeVideo: TrackWelcomeVideo; enrollments: Enrollment[]; certificate: Certificate | null; completedLessonCodes: string[]; gameProfile: GamificationProfile; levels: ArtistLevel[] };

async function dashboardData(requestedTrack?: string): Promise<DashboardData> {
  const supabase = await createClient();
  if (!supabase) return { profile: demoProfile, lessons: lessonsFor(demoProfile.track), welcomeVideo: defaultWelcome(demoProfile), enrollments: [{ student_id: demoProfile.id, track: demoProfile.track, enrollment_date: demoProfile.enrollment_date!, payment_status: "active" }], certificate: null, completedLessonCodes: [], gameProfile: demoGameProfile, levels: fallbackArtistLevels };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { profile: demoProfile, lessons: lessonsFor(demoProfile.track), welcomeVideo: defaultWelcome(demoProfile), enrollments: [], certificate: null, completedLessonCodes: [], gameProfile: demoGameProfile, levels: fallbackArtistLevels };
  const [{ data: profile }, { data: enrollmentRows }, gameSummary] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("enrollments").select("student_id,track,enrollment_date,payment_status").eq("student_id", user.id).eq("payment_status", "active").order("enrollment_date"),
    getGamificationSummary(supabase, user.id),
  ]);
  if (!profile) return { profile: demoProfile, lessons: lessonsFor(demoProfile.track), welcomeVideo: defaultWelcome(demoProfile), enrollments: [], certificate: null, completedLessonCodes: [], gameProfile: gameSummary.profile, levels: gameSummary.levels };
  const enrollments = (enrollmentRows || []) as Enrollment[];
  const requested = ["Drawing", "Painting", "Discovery"].includes(requestedTrack || "") ? requestedTrack as Track : null;
  const selected = enrollments.find((item) => item.track === requested)
    || enrollments.find((item) => item.track === profile.track)
    || enrollments[0];
  const activeProfile = { ...profile, track: selected?.track || profile.track, enrollment_date: selected?.enrollment_date || profile.enrollment_date, payment_status: selected?.payment_status || profile.payment_status } as Profile;
  const [{ data: lessons }, { data: welcomeVideo }, { data: certificate }, { data: quizzes }, { data: assignments }] = await Promise.all([
    supabase.from("lessons").select("*").eq("track", activeProfile.track).order("week_number"),
    supabase.from("track_welcome_videos").select("track,title,youtube_video_id,description").eq("track", activeProfile.track).maybeSingle(),
    supabase.from("certificates").select("id,student_id,track,file_url,certificate_code,issued_at").eq("student_id", user.id).eq("track", activeProfile.track).maybeSingle(),
    supabase.from("quiz_submissions").select("lesson_code").eq("student_id", user.id),
    supabase.from("assignments").select("lesson_code").eq("student_id", user.id).eq("reviewed", true),
  ]);
  const quizCodes = new Set((quizzes || []).map((quiz) => quiz.lesson_code));
  const reviewedCodes = new Set((assignments || []).map((assignment) => assignment.lesson_code));
  return {
    profile: activeProfile,
    lessons: (lessons || []) as Lesson[],
    welcomeVideo: (welcomeVideo as TrackWelcomeVideo | null) || defaultWelcome(activeProfile),
    enrollments,
    certificate: certificate as Certificate | null,
    completedLessonCodes: (lessons || []).map((lesson) => lesson.lesson_code).filter((code) => quizCodes.has(code) && reviewedCodes.has(code)),
    gameProfile: gameSummary.profile,
    levels: gameSummary.levels,
  };
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ track?: string }> }) {
  const { track } = await searchParams;
  const { profile, lessons, welcomeVideo, enrollments, certificate, completedLessonCodes, gameProfile, levels } = await dashboardData(track);
  const unlocked = lessons.filter((lesson) => isLessonUnlocked(lesson, profile));
  const current = unlocked.at(-1);
  const progress = lessons.length ? Math.round((completedLessonCodes.length / lessons.length) * 100) : 0;
  const artistLevel = levelProgress(gameProfile, levels);

  return (
    <AppShell name={profile.name} track={profile.track}>
      <div className="dash-head">
        <div><span className="subtle">Good to see you,</span><h1>{profile.name.split(" ")[0]}.</h1></div>
        <span className="pill">● Enrollment active</span>
      </div>
      {certificate && <CertificateCard certificate={certificate} />}
      <section className="dashboard-game-strip"><div className="dashboard-level"><span>{gameProfile.current_level}</span><div><small>{artistLevel.current.title}</small><strong>{artistLevel.next ? `${artistLevel.next.min_xp - gameProfile.lifetime_xp} XP to level ${artistLevel.next.level}` : "Highest level reached"}</strong></div></div><div className="dashboard-mini-xp"><span style={{ width: `${artistLevel.percentage}%` }} /></div><div className="dashboard-rewards"><span><Sparkles size={15} /> {gameProfile.lifetime_xp} XP</span><span><Coins size={15} /> {gameProfile.gold_brush_balance}</span><span><Flame size={15} /> {gameProfile.current_streak}</span></div><Link href="/studio"><Frame size={15} /> Personal Studio</Link></section>
      <section className="progress-card">
        <div><h2>{profile.track}{profile.track === "Discovery" ? "" : " Guided"}</h2><p>Enrolled {formatDate(profile.enrollment_date)} · {completedLessonCodes.length} of {lessons.length} lesson reviews complete · Current lesson {current?.lesson_code || "—"}</p></div>
        <span className="progress-value">{progress}%</span>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
      </section>
      {enrollments.length > 1 && <nav className="course-switcher" aria-label="Your enrolled courses">{enrollments.map((enrollment) => <Link className={enrollment.track === profile.track ? "active" : ""} href={`/dashboard?track=${enrollment.track}`} key={enrollment.track}>{enrollment.track}</Link>)}</nav>}
      <WelcomeVideo video={welcomeVideo} />
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
