import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { dualPrice } from "@/lib/pricing";

const tracks = [
  { n: "01", name: "Discovery", track: "Discovery" as const, description: "A seven-lesson introduction for curious beginners ready to discover how artists see.", detail: "7 lessons" },
  { n: "02", name: "Drawing Guided", track: "Drawing" as const, description: "Build a lasting foundation through observation, form, light, portraiture and composition.", detail: "12 weeks" },
  { n: "03", name: "Painting Guided", track: "Painting" as const, description: "Move from confident colour mixing to expressive, resolved paintings with personal meaning.", detail: "12+ lessons" },
];

export default function HomePage() {
  return (
    <div className="shell">
      <section className="hero">
        <header className="topbar container">
          <Logo />
          <nav className="nav-actions">
            <a className="text-link" href="#tracks">Explore tracks</a>
            <Link className="text-link" href="/login">Student login</Link>
            <Link className="button small" href="/signup">Begin your practice</Link>
          </nav>
        </header>
        <div className="container">
          <div className="hero-content">
            <div className="eyebrow">Beo School of Art · Volume One</div>
            <h1>Learn to see.<br /><em>Make what matters.</em></h1>
            <p className="hero-copy">A guided studio practice in drawing and painting—built for emerging artists who want structure, thoughtful feedback, and the courage to make honest work.</p>
            <div className="hero-actions">
              <Link className="button" href="/signup">Choose your track <ArrowRight size={16} /></Link>
              <Link className="button ghost" href="/dashboard">Preview the school</Link>
            </div>
            <div className="hero-proof">
              <div className="avatar-stack"><span className="mini-avatar">AO</span><span className="mini-avatar">TB</span><span className="mini-avatar">NE</span></div>
              <span>A focused learning room for committed artists.</span>
            </div>
          </div>
        </div>
      </section>
      <section className="section container" id="tracks">
        <div className="section-head">
          <div><div className="eyebrow">Three ways to begin</div><h2>Find your way into the work.</h2></div>
          <p className="section-note">Each track combines clear demonstrations, short knowledge checks, practical assignments, and a learning rhythm you can sustain.</p>
        </div>
        <div className="tracks">
          {tracks.map((track) => (
            <Link href={`/signup?track=${track.name.split(" ")[0]}`} className="track-card" key={track.name}>
              <span className="track-number">{track.n}</span>
              <h3>{track.name}</h3><p>{track.description}</p>
              <div className="track-meta"><span>{track.detail}</span><span>From {dualPrice(track.track)}</span></div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
