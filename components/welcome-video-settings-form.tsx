"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Track, TrackWelcomeVideo } from "@/lib/types";

const tracks: Track[] = ["Discovery", "Drawing", "Painting"];

export function WelcomeVideoSettingsForm({ videos }: { videos: TrackWelcomeVideo[] }) {
  const initial = Object.fromEntries(tracks.map((track) => {
    const video = videos.find((item) => item.track === track);
    return [track, {
      track,
      title: video?.title || `Welcome to ${track}`,
      youtube_video_id: video?.youtube_video_id || "",
      description: video?.description || "",
    }];
  })) as Record<Track, TrackWelcomeVideo>;
  const [rows, setRows] = useState(initial);
  const [saving, setSaving] = useState<Track | null>(null);

  function change(track: Track, field: "title" | "youtube_video_id" | "description", value: string) {
    setRows((current) => ({ ...current, [track]: { ...current[track], [field]: value } }));
  }

  async function save(track: Track) {
    setSaving(track);
    const supabase = createClient();
    if (!supabase) {
      toast.success(`${track} welcome video saved in demo mode.`);
      setSaving(null);
      return;
    }
    const row = rows[track];
    const { error } = await supabase.from("track_welcome_videos").upsert({
      track,
      title: row.title.trim(),
      youtube_video_id: row.youtube_video_id?.trim() || null,
      description: row.description.trim(),
      updated_at: new Date().toISOString(),
    });
    if (error) toast.error(error.message);
    else toast.success(`${track} welcome video updated.`);
    setSaving(null);
  }

  return (
    <section className="surface welcome-settings">
      <h2>Track welcome videos</h2>
      <p className="subtle">Paste only the YouTube video ID, such as <code>dQw4w9WgXcQ</code>. These orientation videos never show a quiz or assignment.</p>
      <div className="welcome-settings-list">
        {tracks.map((track) => (
          <div className="welcome-settings-row" key={track}>
            <h3>{track}</h3>
            <div className="field"><label htmlFor={`${track}-welcome-title`}>Title</label><input className="input" id={`${track}-welcome-title`} value={rows[track].title} onChange={(event) => change(track, "title", event.target.value)} /></div>
            <div className="field"><label htmlFor={`${track}-welcome-id`}>YouTube video ID</label><input className="input" id={`${track}-welcome-id`} value={rows[track].youtube_video_id || ""} onChange={(event) => change(track, "youtube_video_id", event.target.value)} placeholder="YouTube video ID" /></div>
            <div className="field"><label htmlFor={`${track}-welcome-description`}>Short introduction</label><textarea className="input feedback-input" id={`${track}-welcome-description`} value={rows[track].description} onChange={(event) => change(track, "description", event.target.value)} /></div>
            <button className="button small" type="button" disabled={saving === track || !rows[track].title.trim()} onClick={() => save(track)}>{saving === track ? "Saving…" : `Save ${track}`}</button>
          </div>
        ))}
      </div>
    </section>
  );
}
