import { Camera, CheckCircle2, Heart, MessageCircle, Repeat2, ShieldCheck, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getCurrentProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

const weeklyPlan = [
  ["Monday", "Studio moment", "Share what you are beginning, testing, or learning."],
  ["Wednesday", "Process", "Post a short clip or carousel showing one part of the work developing."],
  ["Friday", "Finished work", "Share the strongest image with a simple story about why you made it."],
  ["Sunday", "Reflection", "Talk about one lesson, mistake, material, artist, or idea that helped you."],
];

export default async function SocialMediaGuidePage() {
  const profile = await getCurrentProfile();
  return (
    <AppShell name={profile.name} track={profile.track}>
      <article className="guide-page">
        <header className="guide-hero">
          <div className="eyebrow"><Sparkles size={15} /> Free student guide</div>
          <h1>How to share your art like a Gen Z artist.</h1>
          <p>You do not need to become an influencer. You need a clear way to document your practice, tell honest stories, and help the right people remember your work.</p>
        </header>

        <section className="guide-principles">
          <div><Camera size={22} /><strong>Document, don’t perform</strong><p>Record what is already happening in your studio instead of inventing a different personality for the internet.</p></div>
          <div><Heart size={22} /><strong>Build connection</strong><p>People remember the feeling, decision, mistake, or story behind a work—not only the polished final photograph.</p></div>
          <div><Repeat2 size={22} /><strong>Repeat your signals</strong><p>Your colours, subjects, questions, materials, and point of view become recognisable when they appear consistently.</p></div>
        </section>

        <section className="surface guide-section">
          <span className="lesson-code">01 · Set up your artist profile</span>
          <h2>Make it easy to understand who you are.</h2>
          <ul className="guide-checklist">
            <li><CheckCircle2 /> Use your artist name consistently.</li>
            <li><CheckCircle2 /> Choose a clear portrait or recognisable mark.</li>
            <li><CheckCircle2 /> Write one sentence explaining what you make or explore.</li>
            <li><CheckCircle2 /> Add your city and a portfolio, shop, or contact link when relevant.</li>
            <li><CheckCircle2 /> Pin three posts: an introduction, your strongest work, and your process.</li>
          </ul>
          <div className="guide-example"><strong>Simple bio formula</strong><p>[Name] · visual artist in [city]<br />I make [type of work] about [subject or feeling].<br />Commissions / portfolio ↓</p></div>
        </section>

        <section className="surface guide-section">
          <span className="lesson-code">02 · Use four content pillars</span>
          <h2>You never need to wonder what to post.</h2>
          <div className="guide-grid">
            <div><strong>Finished work</strong><p>Clean images, details, scale, framing, and the story behind the piece.</p></div>
            <div><strong>Process</strong><p>Sketches, colour mixing, mistakes, materials, time-lapses, and before/after moments.</p></div>
            <div><strong>Artist life</strong><p>Your workspace, references, exhibitions, books, music, routines, and honest reflections.</p></div>
            <div><strong>Useful learning</strong><p>Explain one thing you discovered in class using your own words and examples.</p></div>
          </div>
        </section>

        <section className="surface guide-section">
          <span className="lesson-code">03 · Make stronger posts</span>
          <h2>Give every post one clear job.</h2>
          <p>A post can show the work, tell a story, teach something, invite conversation, or announce an opportunity. It does not need to do everything at once.</p>
          <div className="guide-example"><strong>Caption formula</strong><p><b>Hook:</b> the first line that creates curiosity.<br /><b>Story:</b> what happened, changed, or challenged you.<br /><b>Meaning:</b> why the work matters to you.<br /><b>Invitation:</b> one genuine question or next step.</p></div>
          <div className="guide-example"><strong>Example</strong><p>I nearly painted over this portrait.<br /><br />The colours felt too loud until I stopped trying to copy the photograph and paid attention to the mood I remembered. The blue stayed because it felt more honest than the skin tone in the reference.<br /><br />Which version would you have kept?</p></div>
        </section>

        <section className="surface guide-section">
          <span className="lesson-code">04 · A sustainable weekly rhythm</span>
          <h2>Consistency without content burnout.</h2>
          <div className="guide-schedule">{weeklyPlan.map(([day, type, description]) => <div key={day}><span>{day}</span><strong>{type}</strong><p>{description}</p></div>)}</div>
          <p className="subtle">Start with two posts a week if four is too much. A rhythm you can sustain is more valuable than a busy week followed by silence.</p>
        </section>

        <section className="surface guide-section">
          <span className="lesson-code">05 · Community and safety</span>
          <h2>Grow without losing yourself.</h2>
          <ul className="guide-checklist">
            <li><MessageCircle /> Leave specific, thoughtful comments on work you genuinely care about.</li>
            <li><MessageCircle /> Reply to people as humans, not as numbers.</li>
            <li><ShieldCheck /> Watermark only when needed and keep high-resolution sale files private.</li>
            <li><ShieldCheck /> Never publish your home address, private school information, or live location.</li>
            <li><ShieldCheck /> For younger students, involve a parent or guardian in messages, sales, and meetings.</li>
            <li><ShieldCheck /> Block harassment and suspicious offers without feeling guilty.</li>
          </ul>
        </section>

        <section className="settings-note guide-closing"><strong>Your first challenge</strong><p>For the next 30 days, document each studio session with one photograph and one ten-second clip. Post only the strongest moments. At the end of the month, notice which subjects, colours, stories, and questions keep returning—those repeated signals are the beginning of your artistic identity.</p></section>
      </article>
    </AppShell>
  );
}
