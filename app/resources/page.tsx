import { ArrowRight, Compass, Palette, Pencil, Sparkles } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getCurrentProfile } from "@/lib/profile";
import { dualPrice } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import type { Enrollment, Track } from "@/lib/types";

export const dynamic = "force-dynamic";

const courses: Array<{ track: Track; icon: typeof Pencil; copy: string }> = [
  { track: "Drawing", icon: Pencil, copy: "A 12-week guided practice in observation, form, light, portraiture, and composition." },
  { track: "Painting", icon: Palette, copy: "A guided painting practice covering colour, brushwork, light, portraits, and personal expression." },
  { track: "Discovery", icon: Compass, copy: "Seven immediately available lessons for beginners discovering how artists see and make work." },
];

export default async function ResourcesPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  let enrollments: Enrollment[] = [];
  let unlockedResources: Array<{ item_key: string; name: string; description: string }> = [];
  if (supabase && profile.id !== "demo-student") {
    const [{ data }, { data: inventory }] = await Promise.all([
      supabase.from("enrollments").select("student_id,track,enrollment_date,payment_status").eq("student_id", profile.id),
      supabase.from("student_inventory").select("item:studio_catalog_items(item_key,name,description,category)").eq("student_id", profile.id),
    ]);
    enrollments = (data || []) as Enrollment[];
    unlockedResources = (inventory || []).map((row) => {
      const item = row.item as unknown as { item_key: string; name: string; description: string; category: string } | { item_key: string; name: string; description: string; category: string }[];
      return Array.isArray(item) ? item[0] : item;
    }).filter((item) => item?.category === "resource");
  } else {
    enrollments = [{ student_id: profile.id, track: profile.track, enrollment_date: profile.enrollment_date!, payment_status: profile.payment_status }];
  }
  const enrollmentStatus = new Map(enrollments.map((item) => [item.track, item.payment_status]));

  return (
    <AppShell name={profile.name} track={profile.track}>
      <div className="dash-head">
        <div><span className="subtle">Your studio and available courses</span><h1>Resources.</h1></div>
      </div>
      <section className="resource-grid">
        {courses.map(({ track, icon: Icon, copy }) => {
          const status = enrollmentStatus.get(track);
          const enrolled = status === "active";
          const pastDue = status === "past_due";
          return (
            <article className="resource-card" key={track}>
              <Icon size={25} />
              <h2>{track}{track === "Discovery" ? "" : " Guided"}</h2>
              <p>{copy}</p>
              <span className={`resource-access ${enrolled ? "enrolled" : ""}`}>{enrolled ? "Enrolled" : pastDue ? "Payment needs attention" : dualPrice(track)}</span>
              <Link href={enrolled ? `/dashboard?track=${track}` : pastDue ? "/settings" : `/checkout?track=${track}`}>{enrolled ? "Open course" : pastDue ? "Manage payment" : track === "Discovery" ? "Buy Discovery" : `Enroll in ${track}`} <ArrowRight size={14} /></Link>
            </article>
          );
        })}
        <article className="resource-card free-guide-card">
          <Sparkles size={25} />
          <h2>The Gen Z Artist’s Social Guide</h2>
          <p>A practical, pressure-free guide to sharing your work, finding your visual voice, making useful content, and building an honest audience online.</p>
          <span className="resource-access enrolled">Free for every Beo student</span>
          <Link href="/guides/social-media">Open the guide <ArrowRight size={14} /></Link>
        </article>
      </section>
      {unlockedResources.length > 0 && <section className="unlocked-practice-library"><div className="content-title"><h2>Unlocked practice packs</h2><span>Bought with Gold Brushes · yours to keep</span></div><div className="resource-grid">{unlockedResources.map((item) => <article className="resource-card reward-resource" id={item.item_key} key={item.item_key}><Sparkles size={22} /><span className="resource-access enrolled">Studio reward</span><h2>{item.name}</h2><p>{item.description}</p>{item.item_key === "portrait-prompts" ? <ol><li>Portrait using only shadow shapes</li><li>Three-expression self portrait</li><li>Profile drawn without outlines</li><li>Portrait from memory, then observation</li></ol> : item.item_key === "object-reference-pack" ? <ol><li>Cup: ellipse and centre line</li><li>Shoe: block in the largest masses</li><li>Fruit: five-value light study</li><li>Keys: overlap and negative space</li></ol> : <ol><li>Warm limited palette</li><li>Cool limited palette</li><li>Complementary contrast</li><li>One colour plus white study</li></ol>}</article>)}</div></section>}
      <section className="surface" id="materials" style={{ marginTop: 22 }}>
        <div className="eyebrow">Your current studio setup</div>
        <h2 style={{ marginTop: 20 }}>{profile.track} materials</h2>
        <div className="notes">
          {profile.track === "Painting"
            ? "Sketchbook · HB and 2B pencils · limited primary palette · titanium white · flat and round brushes · palette knife · water or medium jar · cotton cloths"
            : "A3 cartridge paper · HB, 2B, 4B and 6B pencils · vine charcoal · kneaded eraser · sharpener · masking tape · drawing board"}
        </div>
      </section>
    </AppShell>
  );
}
