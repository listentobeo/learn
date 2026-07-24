"use client";

import { ImagePlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function AssignmentUpload({ lessonCode, instructions }: { lessonCode: string; instructions: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!file) return toast.error("Choose a photo of your work first.");
    setLoading(true);
    const body = new FormData();
    body.append("file", file);
    body.append("lessonCode", lessonCode);
    const res = await fetch("/api/assignments", { method: "POST", body });
    if (!res.ok) { toast.error("Upload failed. Please try again."); setLoading(false); return; }
    setSubmitted(true);
    toast.success("Assignment submitted for review.");
  }

  if (submitted) return <div className="surface assignment-card"><div className="eyebrow">Submitted</div><h2 style={{ marginTop: 18 }}>Awaiting review</h2><p>Benjamin has been notified. Your work will stay here while you wait for your review call.</p></div>;

  return (
    <aside className="surface assignment-card">
      <h2>Practical assignment</h2><p>{instructions}</p>
      <label className="dropzone"><ImagePlus size={24} /><span>{file ? file.name : "Tap to upload your work"}</span><small>JPG, PNG or WebP · up to 10 MB</small><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
      <button className="button" style={{ width: "100%" }} onClick={submit} disabled={loading}>{loading ? "Uploading…" : "Submit assignment"}</button>
    </aside>
  );
}
