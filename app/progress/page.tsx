import { Award, CheckCircle2, CircleDashed, Clock3, Coins, Flame, Frame, Gamepad2, Lock, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { CertificateCard } from "@/components/certificate-card";
import { demoGameProfile, fallbackArtistLevels, getGamificationSummary, levelProgress } from "@/lib/gamification";
import { demoProfile, lessonsFor } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import type { Certificate, Enrollment, GamificationProfile, Lesson, Profile, StudentAchievement, Track } from "@/lib/types";
import { isLessonUnlocked } from "@/lib/utils";

type QuizRow = { lesson_code: string; score: number; attempt_number: number; submitted_at: string };
type AssignmentRow = { lesson_code: string; submitted_at: string; seen_at: string | null; reviewed: boolean; reviewed_at: string | null; feedback: string | null };

function badgeIcon(icon: string) {
  if (icon === "check") return CheckCircle2;
  if (icon === "flame") return Flame;
  if (icon === "certificate") return Award;
  if (icon === "image") return Frame;
  return Trophy;
}

export default async function ProgressPage({ searchParams }: { searchParams: Promise<{ track?: string }> }) {
  const { track: requestedTrack } = await searchParams;
  const supabase = await createClient();
  let profile = demoProfile as Profile;
  let enrollments: Enrollment[] = [{ student_id: profile.id, track: profile.track, enrollment_date: profile.enrollment_date!, payment_status: "active" }];
  let lessons = lessonsFor(profile.track);
  let quizzes: QuizRow[] = [];
  let assignments: AssignmentRow[] = [];
  let certificate: Certificate | null = null;
  let gameProfile = demoGameProfile as GamificationProfile;
  let levels = fallbackArtistLevels;
  let achievements: StudentAchievement[] = [];
  let completedChallenges = new Set<string>();

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const [{ data: profileRow }, { data: enrollmentRows }, summary] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("enrollments").select("student_id,track,enrollment_date,payment_status").eq("student_id", user.id).eq("payment_status", "active").order("enrollment_date"),
        getGamificationSummary(supabase, user.id),
      ]);
      if (profileRow) profile = profileRow as Profile;
      gameProfile = summary.profile;
      levels = summary.levels;
      achievements = summary.achievements;
      enrollments = (enrollmentRows || []) as Enrollment[];
      const allowedTrack = ["Drawing", "Painting", "Discovery"].includes(requestedTrack || "") ? requestedTrack as Track : null;
      const selected = enrollments.find((item) => item.track === allowedTrack) || enrollments.find((item) => item.track === profile.track) || enrollments[0];
      if (selected) profile = { ...profile, track: selected.track, enrollment_date: selected.enrollment_date, payment_status: selected.payment_status };
      const [{ data: lessonRows }, { data: quizRows }, { data: assignmentRows }, { data: certificateRow }, { data: challengeRows }] = await Promise.all([
        supabase.from("lessons").select("*").eq("track", profile.track).order("week_number"),
        supabase.from("quiz_submissions").select("lesson_code,score,attempt_number,submitted_at").eq("student_id", user.id).order("submitted_at", { ascending: false }),
        supabase.from("assignments").select("lesson_code,submitted_at,seen_at,reviewed,reviewed_at,feedback").eq("student_id", user.id).order("submitted_at", { ascending: false }),
        supabase.from("certificates").select("id,student_id,track,file_url,certificate_code,issued_at").eq("student_id", user.id).eq("track", profile.track).maybeSingle(),
        supabase.from("game_attempts").select("lesson_game_challenges(lesson_code)").eq("student_id", user.id).eq("is_correct", true),
      ]);
      lessons = (lessonRows || []) as Lesson[];
      quizzes = (quizRows || []) as QuizRow[];
      assignments = (assignmentRows || []) as AssignmentRow[];
      certificate = certificateRow as Certificate | null;
      completedChallenges = new Set((challengeRows || []).map((row) => {
        const relation = row.lesson_game_challenges as unknown as { lesson_code: string } | { lesson_code: string }[];
        return Array.isArray(relation) ? relation[0]?.lesson_code : relation?.lesson_code;
      }).filter(Boolean));
    }
  }

  const latestQuiz = new Map<string, QuizRow>();
  for (const quiz of quizzes) if (!latestQuiz.has(quiz.lesson_code)) latestQuiz.set(quiz.lesson_code, quiz);
  const assignmentByLesson = new Map(assignments.map((assignment) => [assignment.lesson_code, assignment]));
  const completedLessons = lessons.filter((lesson) => latestQuiz.has(lesson.lesson_code) && assignmentByLesson.get(lesson.lesson_code)?.reviewed).length;
  const quizCount = lessons.filter((lesson) => latestQuiz.has(lesson.lesson_code)).length;
  const reviewedCount = lessons.filter((lesson) => assignmentByLesson.get(lesson.lesson_code)?.reviewed).length;
  const percentage = lessons.length ? Math.round((completedLessons / lessons.length) * 100) : 0;
  const level = levelProgress(gameProfile, levels);
  const questLesson = lessons.find((lesson) => isLessonUnlocked(lesson, profile) && !(latestQuiz.has(lesson.lesson_code) && assignmentByLesson.get(lesson.lesson_code)?.reviewed));
  const questQuiz = questLesson ? latestQuiz.get(questLesson.lesson_code) : null;
  const questAssignment = questLesson ? assignmentByLesson.get(questLesson.lesson_code) : null;
  const quest = !questLesson
    ? { title: certificate ? "Your track is complete" : "All requirements are complete", copy: certificate ? "Your certificate and finished work are waiting in your Personal Studio." : "Your certificate will appear after the final completion check.", href: "/studio", action: "Open Personal Studio" }
    : !completedChallenges.has(questLesson.lesson_code)
      ? { title: `Play ${questLesson.lesson_code} Studio Challenge`, copy: "Warm up with the lesson idea, then move into the knowledge check.", href: `/lesson/${questLesson.lesson_code}`, action: "Start challenge" }
      : !questQuiz
        ? { title: `Complete the ${questLesson.lesson_code} knowledge check`, copy: "Use the Studio Challenge idea while answering the three lesson questions.", href: `/lesson/${questLesson.lesson_code}`, action: "Take knowledge check" }
        : !questAssignment
          ? { title: `Submit your ${questLesson.lesson_code} practical work`, copy: "Photograph the finished work clearly. It will enter your studio wall immediately.", href: `/lesson/${questLesson.lesson_code}`, action: "Open assignment" }
          : !questAssignment.reviewed
            ? { title: `${questLesson.lesson_code} is awaiting review`, copy: questAssignment.seen_at ? "Benjamin has seen your work. Choose a review-call time when you are ready." : "Your assignment is safely framed in your studio while Benjamin prepares the review.", href: questAssignment.seen_at ? "/reviews" : "/studio", action: questAssignment.seen_at ? "Choose review time" : "View framed work" }
            : { title: `Continue ${questLesson.lesson_code}`, copy: "Return to the lesson and complete the remaining requirement.", href: `/lesson/${questLesson.lesson_code}`, action: "Continue" };

  return (
    <AppShell name={profile.name} track={profile.track}>
      <div className="journey-heading"><div><span className="eyebrow">Your practice becomes visible</span><h1>My Studio Journey.</h1><p>Complete real schoolwork, grow your artist level and build a studio filled with your own art.</p></div><Link className="button ghost" href="/studio"><Frame size={16} /> Enter Personal Studio</Link></div>
      {enrollments.length > 1 && <nav className="course-switcher" aria-label="Progress by course">{enrollments.map((enrollment) => <Link className={enrollment.track === profile.track ? "active" : ""} href={`/progress?track=${enrollment.track}`} key={enrollment.track}>{enrollment.track}</Link>)}</nav>}
      {certificate && <CertificateCard certificate={certificate} />}

      <section className="journey-economy">
        <div className="level-orbit"><span>{gameProfile.current_level}</span><small>Artist level</small></div>
        <div className="level-copy"><span className="eyebrow">{level.current.title}</span><h2>{level.next ? `${level.next.min_xp - gameProfile.lifetime_xp} XP to ${level.next.title}` : "Highest artist level reached"}</h2><div className="journey-xp-track"><span style={{ width: `${level.percentage}%` }} /></div><small>{gameProfile.lifetime_xp.toLocaleString()} lifetime XP</small></div>
        <div className="journey-wallet"><div><Coins size={19} /><strong>{gameProfile.gold_brush_balance}</strong><span>Gold Brushes</span></div><div><Flame size={19} /><strong>{gameProfile.current_streak}</strong><span>Week rhythm</span></div></div>
      </section>

      <section className="current-quest">
        <div className="quest-marker"><Sparkles size={22} /><span>Current quest</span></div><div><h2>{quest.title}</h2><p>{quest.copy}</p></div><Link className="button" href={quest.href}>{quest.action}</Link>
      </section>

      <section className="journey-track-card">
        <div className="journey-track-head"><div><span className="eyebrow">{profile.track} Track</span><h2>{completedLessons} of {lessons.length} levels mastered</h2></div><strong>{percentage}%</strong></div>
        <div className="journey-path">
          {lessons.map((lesson, index) => {
            const open = isLessonUnlocked(lesson, profile);
            const quiz = latestQuiz.get(lesson.lesson_code);
            const assignment = assignmentByLesson.get(lesson.lesson_code);
            const challengeDone = completedChallenges.has(lesson.lesson_code);
            const complete = Boolean(quiz && assignment?.reviewed);
            const state = !open ? "locked" : complete ? "complete" : assignment ? "review" : quiz ? "assignment" : challengeDone ? "quiz" : "challenge";
            return (
              <article className={`journey-node ${state}`} key={lesson.lesson_code}>
                <div className="journey-line" />
                <div className="journey-node-icon">{!open ? <Lock size={16} /> : complete ? <CheckCircle2 size={18} /> : assignment ? <Clock3 size={17} /> : challengeDone ? <Gamepad2 size={17} /> : <CircleDashed size={17} />}</div>
                <div className="journey-node-copy"><span>Level {index + 1} · {lesson.lesson_code}</span><h3>{lesson.title}</h3><p>{!open ? `Unlocks in week ${lesson.week_number}` : complete ? "Challenge, quiz and review complete" : assignment ? assignment.seen_at ? "Seen by Benjamin" : "Framed · awaiting review" : quiz ? "Practical assignment next" : challengeDone ? "Knowledge check next" : "Studio Challenge ready"}</p></div>
                {open && <Link href={`/lesson/${lesson.lesson_code}`}>{complete ? "Review lesson" : "Continue"}</Link>}
              </article>
            );
          })}
        </div>
      </section>

      <section className="studio-cabinet">
        <div className="content-title"><h2>Studio Cabinet</h2><span>{achievements.length} badges earned</span></div>
        {achievements.length ? <div className="badge-grid">{achievements.map((award) => { const Icon = badgeIcon(award.achievement.icon_key); return <article className="badge-card" key={award.id}><div><Icon size={22} /></div><span>{award.achievement.name}</span><p>{award.achievement.description}</p></article>; })}</div> : <div className="empty-state"><Trophy size={28} /><strong>Your first badge is close.</strong><span>Complete a knowledge check or submit an assignment to begin the cabinet.</span></div>}
      </section>

      <section className="admin-stats progress-stats">
        <div className="stat"><span>Required lessons</span><strong>{lessons.length}</strong></div>
        <div className="stat"><span>Knowledge checks</span><strong>{quizCount}/{lessons.length}</strong></div>
        <div className="stat"><span>Reviews complete</span><strong>{reviewedCount}/{lessons.length}</strong></div>
        <div className="stat"><span>Track completion</span><strong>{percentage}%</strong></div>
      </section>

      <div className="content-title"><h2>Detailed lesson record</h2><span>Latest quiz attempt shown</span></div>
      <div className="progress-records">
        {lessons.map((lesson) => {
          const quiz = latestQuiz.get(lesson.lesson_code);
          const assignment = assignmentByLesson.get(lesson.lesson_code);
          const complete = Boolean(quiz && assignment?.reviewed);
          return (
            <article className="surface progress-record" key={lesson.lesson_code}>
              <div className="progress-record-head">{complete ? <CheckCircle2 size={19} /> : assignment ? <Clock3 size={19} /> : <CircleDashed size={19} />}<div><span className="lesson-code">{lesson.lesson_code}</span><h2>{lesson.title}</h2></div><strong className={complete ? "complete" : ""}>{complete ? "Complete" : "In progress"}</strong></div>
              <div className="progress-detail-grid"><div><span>Latest quiz</span><strong>{quiz ? `${quiz.score}/3 · Attempt ${quiz.attempt_number}` : "Not submitted"}</strong></div><div><span>Assignment</span><strong>{assignment?.reviewed ? "Review complete" : assignment?.seen_at ? "Seen by Benjamin" : assignment ? "Awaiting review" : "Not submitted"}</strong></div></div>
              {assignment?.feedback && <div className="feedback-box"><span>Benjamin’s feedback</span><p>{assignment.feedback}</p></div>}
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
