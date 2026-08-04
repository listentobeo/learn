import { AppShell } from "@/components/app-shell";
import { AdminGamificationControls } from "@/components/admin-gamification-controls";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminGamificationPage() {
  const admin = createAdminClient();
  let enabled = true;
  let catalog: Array<{ id: string; name: string; category: string; price: number; minimum_level: number; active: boolean }> = [];
  let challenges: Array<{ id: string; lesson_code: string; title: string; reward_xp: number; reward_brushes: number; approved: boolean; active: boolean }> = [];
  let students: Array<{ id: string; name: string; email: string }> = [];
  let profiles = 0;
  let xpAwarded = 0;
  let brushesInCirculation = 0;
  if (admin) {
    const [{ data: setting }, { data: items }, { data: challengeRows }, { data: studentRows }, { data: gameProfiles }] = await Promise.all([
      admin.from("gamification_settings").select("enabled").eq("id", true).maybeSingle(),
      admin.from("studio_catalog_items").select("id,name,category,price,minimum_level,active").order("sort_order"),
      admin.from("lesson_game_challenges").select("id,lesson_code,title,reward_xp,reward_brushes,approved,active").order("lesson_code"),
      admin.from("profiles").select("id,name,email").eq("role", "student").order("name"),
      admin.from("gamification_profiles").select("lifetime_xp,gold_brush_balance"),
    ]);
    enabled = setting?.enabled !== false;
    catalog = items || [];
    challenges = challengeRows || [];
    students = studentRows || [];
    profiles = gameProfiles?.length || 0;
    xpAwarded = (gameProfiles || []).reduce((total, row) => total + row.lifetime_xp, 0);
    brushesInCirculation = (gameProfiles || []).reduce((total, row) => total + row.gold_brush_balance, 0);
  }
  return <AppShell admin name="Benjamin Odeke" track=""><div className="dash-head"><div><span className="subtle">Rewards, progress and Personal Studios</span><h1>Game control room.</h1></div><span className="pill">{enabled ? "Game active" : "Game paused"}</span></div><section className="admin-stats"><div className="stat"><span>Artist profiles</span><strong>{profiles}</strong></div><div className="stat"><span>Total XP earned</span><strong>{xpAwarded.toLocaleString()}</strong></div><div className="stat"><span>Brushes held</span><strong>{brushesInCirculation.toLocaleString()}</strong></div><div className="stat"><span>Challenges ready</span><strong>{challenges.filter((item) => item.approved && item.active).length}/32</strong></div></section>{admin ? <AdminGamificationControls enabled={enabled} catalog={catalog} challenges={challenges} students={students} /> : <section className="surface"><h2>Connect Supabase to manage the live game.</h2></section>}</AppShell>;
}
