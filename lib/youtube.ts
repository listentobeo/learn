type YouTubeVideo = { id: string; title: string; thumbnail: string | null };

export async function getYouTubeVideo(videoId: string | null): Promise<YouTubeVideo | null> {
  if (!videoId) return null;
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return { id: videoId, title: "Lesson video", thumbnail: null };
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,status");
  url.searchParams.set("id", videoId);
  url.searchParams.set("key", key);
  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) return null;
  const payload = await response.json();
  const item = payload.items?.[0];
  if (!item || item.status?.privacyStatus === "private") return null;
  return {
    id: item.id,
    title: item.snippet?.title || "Lesson video",
    thumbnail: item.snippet?.thumbnails?.maxres?.url || item.snippet?.thumbnails?.high?.url || null,
  };
}
