"use client";

import { Play } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function RunCompletionChecksButton() {
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    const response = await fetch("/api/admin/completions/run", { method: "POST" });
    const result = await response.json();
    setRunning(false);
    if (!response.ok) return toast.error(result.error || "Unable to run completion checks.");
    if (result.failed) {
      const firstError = result.results?.find((item: { error?: string }) => item.error)?.error;
      return toast.error(firstError || `${result.failed} completion checks failed.`);
    }
    toast.success(`${result.certificates} certificate${result.certificates === 1 ? "" : "s"} generated.`);
    window.location.reload();
  }

  return (
    <button className="button small" disabled={running} onClick={run}>
      <Play size={14} />
      {running ? "Checking..." : "Run completion checks now"}
    </button>
  );
}
