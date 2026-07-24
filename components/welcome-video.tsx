import { PlayCircle } from "lucide-react";
import type { TrackWelcomeVideo } from "@/lib/types";

export function WelcomeVideo({ video }: { video: TrackWelcomeVideo }) {
  return (
    <section className="welcome-card">
      <div className="welcome-copy">
        <span className="eyebrow">Start here</span>
        <h2>{video.title}</h2>
        <p>{video.description}</p>
        <span className="welcome-note">This is your track orientation. It has no quiz or assignment.</span>
      </div>
      <div className="welcome-video">
        {video.youtube_video_id ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.youtube_video_id)}`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="video-placeholder"><div><PlayCircle size={38} /><span>Welcome video will appear here once Benjamin adds it.</span></div></div>
        )}
      </div>
    </section>
  );
}
