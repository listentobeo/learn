import { AppShell } from "@/components/app-shell";
import { AdminGamificationControls } from "@/components/admin-gamification-controls";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminGamificationPage() {
  const admin = createAdminClient();
  let enabled = true;
  let catalog: Array<{ id: string; name: string; category: string; price: number; minimum_level: number; active: boolean }> = [];
  let students: Array<{ id: string; name: string; email: string }> = [];
  let profiles = 0;
  let xpAwarded = 0;
  let brushesInCirculation = 0;
  if (admin) {
    const [{ data: setting }, { data: items }, { data: studentRows }, { data: gameProfiles }] = await Promise.all([
      admin.from("gamification_settings").select("enabled").eq("id", true).maybeSingle(),
      admin.from("studio_catalog_items").select("id,name,category,price,minimum_level,active").order("sort_order"),
      admin.from("profiles").select("id,name,email").eq("role", "student").order("name"),
      admin.from("gamification_profiles").select("lifetime_xp,gold_brush_balance"),
    ]);
    enabled = setting?.enabled !== false;
    catalog = items || [];
    students = studentRows || [];
    profiles = gameProfiles?.length || 0;
    xpAwarded = (gameProfiles || []).reduce((total, row) => total + row.lifetime_xp, 0);
    brushesInCirculation = (gameProfiles || []).reduce((total, row) => total + row.gold_brush_balance, 0);
  }
  return <AppShell admin name="Benjamin Odeke" track=""><div className="dash-head"><div><span className="subtle">Rewards, progress and Personal Studios</span><h1>Reward control room.</h1></div><span className="pill">{enabled ? "Rewards active" : "Rewards paused"}</span></div><section className="admin-stats"><div className="stat"><span>Artist profiles</span><strong>{profiles}</strong></div><div className="stat"><span>Total XP earned</span><strong>{xpAwarded.toLocaleString()}</strong></div><div className="stat"><span>Brushes held</span><strong>{brushesInCirculation.toLocaleString()}</strong></div><div className="stat"><span>Shop items</span><strong>{catalog.filter((item) => item.active).length}</strong></div></section>{admin ? <AdminGamificationControls enabled={enabled} catalog={catalog} students={students} /> : <section className="surface"><h2>Connect Supabase to manage live rewards.</h2></section>}</AppShell>;
}
