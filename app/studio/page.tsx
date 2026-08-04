import { AppShell } from "@/components/app-shell";
import { StudioExperience, type StudioArtwork } from "@/components/studio-experience";
import { demoGameProfile, getGamificationSummary } from "@/lib/gamification";
import { demoProfile } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/server";
import type { GamificationProfile, Profile, StudioCatalogItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const supabase = await createClient();
  let profile = demoProfile as Profile;
  let gameProfile = demoGameProfile;
  let artworks: StudioArtwork[] = [];
  let catalog: StudioCatalogItem[] = [];
  let owned: Array<StudioCatalogItem & { inventoryId: string }> = [];
  let selectedThemeId: string | null = null;
  let certificates: Array<{ track: string; code: string }> = [];
  let setupMissing = false;
  let gameEnabled = true;

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const [{ data: profileRow }, assignmentResult, displayResult, catalogResult, inventoryResult, studioResult, certificateResult, summary] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("assignments").select("id,lesson_code,file_path,submitted_at,reviewed,feedback,lessons(track,title)").eq("student_id", user.id).order("submitted_at"),
        supabase.from("studio_displays").select("assignment_id,frame_item_id,wall_slot").eq("student_id", user.id).order("wall_slot"),
        supabase.from("studio_catalog_items").select("id,item_key,category,name,description,price,minimum_level,visual_config,active,sort_order").eq("active", true).order("sort_order"),
        supabase.from("student_inventory").select("id,item:studio_catalog_items(id,item_key,category,name,description,price,minimum_level,visual_config,active,sort_order)").eq("student_id", user.id),
        supabase.from("student_studios").select("selected_theme_id").eq("student_id", user.id).maybeSingle(),
        supabase.from("certificates").select("track,certificate_code").eq("student_id", user.id).order("issued_at"),
        getGamificationSummary(supabase, user.id),
      ]);
      if (profileRow) profile = profileRow as Profile;
      setupMissing = Boolean(catalogResult.error || inventoryResult.error || displayResult.error || studioResult.error);
      gameProfile = summary.profile;
      gameEnabled = summary.enabled;
      catalog = (catalogResult.data || []) as StudioCatalogItem[];
      const displays = new Map((displayResult.data || []).map((display) => [display.assignment_id, display.frame_item_id]));
      for (const assignment of assignmentResult.data || []) {
        const relation = assignment.lessons as unknown as { track: string; title: string } | { track: string; title: string }[];
        const lesson = Array.isArray(relation) ? relation[0] : relation;
        const { data: signed } = await supabase.storage.from("assignments").createSignedUrl(assignment.file_path, 60 * 60);
        artworks.push({
          id: assignment.id,
          lessonCode: assignment.lesson_code,
          title: lesson?.title || "Practical assignment",
          track: lesson?.track || profile.track,
          imageUrl: signed?.signedUrl || null,
          submittedAt: assignment.submitted_at,
          reviewed: assignment.reviewed,
          feedback: assignment.feedback,
          frameItemId: displays.get(assignment.id) || null,
        });
      }
      owned = (inventoryResult.data || []).map((inventory) => {
        const relation = inventory.item as unknown as StudioCatalogItem | StudioCatalogItem[];
        return { ...(Array.isArray(relation) ? relation[0] : relation), inventoryId: inventory.id };
      }).filter((item) => Boolean(item.id));
      selectedThemeId = studioResult.data?.selected_theme_id || null;
      certificates = (certificateResult.data || []).map((certificate) => ({ track: certificate.track, code: certificate.certificate_code }));
    }
  }

  return (
    <AppShell name={profile.name} track={profile.track}>
      {setupMissing ? <section className="settings-note"><strong>Personal Studio database setup is required.</strong><p>Run <code>20260804_gamified_personal_studio.sql</code> in Supabase, then refresh this page.</p></section> : <StudioExperience name={profile.name} initialProfile={gameProfile as GamificationProfile} artworks={artworks} catalog={catalog} initialOwned={owned} initialThemeId={selectedThemeId} certificates={certificates} enabled={gameEnabled} />}
    </AppShell>
  );
}
