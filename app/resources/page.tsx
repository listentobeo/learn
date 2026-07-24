import { ArrowRight, BookMarked, CirclePlay, Palette } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getCurrentProfile } from "@/lib/profile";

const resources = [
  {
    icon: BookMarked,
    title: "Observation guide",
    copy: "A practical checklist for measuring angles, comparing proportions, and seeing the large shapes first.",
    label: "Review DR1",
    href: "/lesson/DR1",
  },
  {
    icon: Palette,
    title: "Studio materials",
    copy: "Keep your setup simple: the essential pencils, paper, erasers, paints, brushes, and surfaces for your track.",
    label: "Open materials list",
    href: "#materials",
  },
  {
    icon: CirclePlay,
    title: "Current lesson",
    copy: "Return to your course dashboard and continue from the most recently unlocked demonstration.",
    label: "Continue learning",
    href: "/dashboard",
  },
];

export default async function ResourcesPage() {
  const profile = await getCurrentProfile();
  return (
    <AppShell name={profile.name} track={profile.track}>
      <div className="dash-head">
        <div><span className="subtle">Your studio library</span><h1>Resources.</h1></div>
      </div>
      <section className="resource-grid">
        {resources.map(({ icon: Icon, title, copy, label, href }) => (
          <article className="resource-card" key={title}>
            <Icon size={25} />
            <h2>{title}</h2>
            <p>{copy}</p>
            <Link href={href}>{label} <ArrowRight size={14} /></Link>
          </article>
        ))}
      </section>
      <section className="surface" id="materials" style={{ marginTop: 22 }}>
        <div className="eyebrow">Recommended setup</div>
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
