import { AppShell } from "@/components/app-shell";
import { SettingsForm } from "@/components/settings-form";
import { getCurrentProfile } from "@/lib/profile";

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  return (
    <AppShell name={profile.name} track={profile.track} admin={profile.role === "admin"}>
      <div className="dash-head"><div><span className="subtle">Account preferences</span><h1>Settings.</h1></div></div>
      <div className="settings-grid">
        <SettingsForm profile={profile} />
        <aside className="settings-note">
          <strong style={{ color: "var(--ivory)" }}>Your enrollment</strong>
          <p>Your track and email are tied to your enrollment record. Contact support if either needs to change.</p>
          <a className="gold-link" href="mailto:support@beoarts.com">support@beoarts.com</a>
        </aside>
      </div>
    </AppShell>
  );
}
