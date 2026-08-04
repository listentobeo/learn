import type { SupabaseClient } from "@supabase/supabase-js";
import type { ArtistLevel, GamificationProfile, StudentAchievement, StudioChallenge } from "@/lib/types";

export const fallbackArtistLevels: ArtistLevel[] = [
  { level: 1, title: "Curious Observer", min_xp: 0 },
  { level: 2, title: "Mark Maker", min_xp: 250 },
  { level: 3, title: "Skill Builder", min_xp: 700 },
  { level: 4, title: "Developing Artist", min_xp: 1500 },
  { level: 5, title: "Studio Artist", min_xp: 2800 },
  { level: 6, title: "Beo Graduate", min_xp: 4500 },
];

export const demoGameProfile: GamificationProfile = {
  student_id: "demo-student",
  lifetime_xp: 420,
  gold_brush_balance: 75,
  current_level: 2,
  current_streak: 3,
  longest_streak: 4,
  last_activity_on: new Date().toISOString().slice(0, 10),
};

export type GamificationSummary = {
  profile: GamificationProfile;
  levels: ArtistLevel[];
  achievements: StudentAchievement[];
  enabled: boolean;
};

export function levelProgress(profile: GamificationProfile, levels: ArtistLevel[]) {
  const ordered = [...levels].sort((a, b) => a.min_xp - b.min_xp);
  const current = ordered.find((level) => level.level === profile.current_level) || ordered[0];
  const next = ordered.find((level) => level.min_xp > profile.lifetime_xp) || null;
  const earnedInLevel = Math.max(0, profile.lifetime_xp - current.min_xp);
  const range = next ? Math.max(1, next.min_xp - current.min_xp) : Math.max(1, earnedInLevel);
  return {
    current,
    next,
    percentage: next ? Math.min(100, Math.round((earnedInLevel / range) * 100)) : 100,
  };
}

export async function getGamificationSummary(client: SupabaseClient, studentId: string): Promise<GamificationSummary> {
  const [{ data: profile }, { data: levels }, { data: awards }, { data: settings }] = await Promise.all([
    client.from("gamification_profiles").select("student_id,lifetime_xp,gold_brush_balance,current_level,current_streak,longest_streak,last_activity_on").eq("student_id", studentId).maybeSingle(),
    client.from("artist_levels").select("level,title,min_xp").order("min_xp"),
    client.from("student_achievements").select("id,awarded_at,achievement:achievements(achievement_key,name,description,icon_key)").eq("student_id", studentId).order("awarded_at", { ascending: false }),
    client.from("gamification_settings").select("enabled").eq("id", true).maybeSingle(),
  ]);

  return {
    profile: (profile as GamificationProfile | null) || { ...demoGameProfile, student_id: studentId, lifetime_xp: 0, gold_brush_balance: 0, current_level: 1, current_streak: 0, longest_streak: 0, last_activity_on: null },
    levels: (levels as ArtistLevel[] | null) || fallbackArtistLevels,
    achievements: (awards || []).map((award) => {
      const relation = award.achievement as unknown as StudentAchievement["achievement"] | StudentAchievement["achievement"][];
      return { id: award.id, awarded_at: award.awarded_at, achievement: Array.isArray(relation) ? relation[0] : relation };
    }).filter((award) => Boolean(award.achievement)) as StudentAchievement[],
    enabled: settings?.enabled !== false,
  };
}

export async function awardGamificationEvent(client: SupabaseClient, input: {
  studentId: string;
  eventType: string;
  relatedType: string;
  relatedId: string;
  xp: number;
  brushes: number;
  dedupeKey: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await client.rpc("award_gamification_event", {
    p_student_id: input.studentId,
    p_event_type: input.eventType,
    p_related_type: input.relatedType,
    p_related_id: input.relatedId,
    p_xp: input.xp,
    p_gold_brushes: input.brushes,
    p_dedupe_key: input.dedupeKey,
    p_metadata: input.metadata || {},
  });
  if (error) throw error;
  return data as { awarded: boolean; profile: GamificationProfile };
}

export async function getStudioChallenge(client: SupabaseClient, studentId: string, lessonCode: string): Promise<StudioChallenge | null> {
  const { data: setting } = await client.from("gamification_settings").select("enabled").eq("id", true).maybeSingle();
  if (setting?.enabled === false) return null;
  const { data: challenge } = await client
    .from("lesson_game_challenges")
    .select("id,lesson_code,challenge_type,title,prompt,version,challenge_config,reward_xp,reward_brushes,is_mastery")
    .eq("lesson_code", lessonCode)
    .eq("approved", true)
    .eq("active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!challenge) return null;

  const { count } = await client
    .from("game_attempts")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("challenge_id", challenge.id)
    .eq("is_correct", true);
  const config = (challenge.challenge_config || {}) as Record<string, unknown>;
  return {
    id: challenge.id,
    lesson_code: challenge.lesson_code,
    challenge_type: challenge.challenge_type,
    title: challenge.title,
    prompt: challenge.prompt,
    version: challenge.version,
    config: {
      options: Array.isArray(config.options) ? config.options as Array<{ id: string; label: string }> : undefined,
      items: Array.isArray(config.items) ? config.items as Array<{ id: string; label: string }> : undefined,
      targets: Array.isArray(config.targets) ? config.targets as Array<{ id: string; label: string }> : undefined,
    },
    reward_xp: challenge.reward_xp,
    reward_brushes: challenge.reward_brushes,
    is_mastery: challenge.is_mastery,
    completed: Boolean(count),
  };
}
