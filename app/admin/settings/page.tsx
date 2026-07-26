import { CheckCircle2, CircleAlert } from "lucide-react";
import { AdminSettingsForm } from "@/components/admin-settings-form";
import { AppShell } from "@/components/app-shell";
import { WelcomeVideoSettingsForm } from "@/components/welcome-video-settings-form";
import { createClient } from "@/lib/supabase/server";
import type { TrackWelcomeVideo } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  let name = "Benjamin Odeke";
  let email = "admin@beoarts.com";
  let welcomeVideos: TrackWelcomeVideo[] = [];
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("name,email").eq("id", user.id).single();
      name = profile?.name || name;
      email = profile?.email || user.email || email;
      const { data: videos } = await supabase.from("track_welcome_videos").select("track,title,youtube_video_id,description").order("track");
      welcomeVideos = (videos || []) as TrackWelcomeVideo[];
    }
  }
  const integrations = [
    { label: "Supabase database", ready: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY) },
    { label: "Paystack live inline payments", ready: Boolean(process.env.PAYSTACK_SECRET_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY) },
    { label: "YouTube videos", ready: Boolean(process.env.YOUTUBE_API_KEY) },
    { label: "Assignment notifications", ready: Boolean((process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.BENJAMIN_WHATSAPP_NUMBER) || (process.env.RESEND_API_KEY && process.env.BENJAMIN_EMAIL)) },
  ];
  return (
    <AppShell admin name={name} track="">
      <div className="dash-head"><div><span className="subtle">Security and integrations</span><h1>Admin settings.</h1></div></div>
      <div className="settings-grid">
        <AdminSettingsForm name={name} email={email} />
        <aside className="surface">
          <h2>System readiness</h2>
          <div className="integration-list">
            {integrations.map((integration) => <div className="integration-row" key={integration.label}>{integration.ready ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}<span>{integration.label}</span><strong className={integration.ready ? "ready" : "missing"}>{integration.ready ? "Ready" : "Needs setup"}</strong></div>)}
          </div>
          <p className="subtle admin-help">No secret values are displayed here. Update environment variables through your hosting provider.</p>
        </aside>
      </div>
      <WelcomeVideoSettingsForm videos={welcomeVideos} />
    </AppShell>
  );
}
