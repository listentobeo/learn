"use client";

import { useState } from "react";
import { Coins, Gamepad2, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";

type CatalogRow = { id: string; name: string; category: string; price: number; minimum_level: number; active: boolean };
type ChallengeRow = { id: string; lesson_code: string; title: string; reward_xp: number; reward_brushes: number; approved: boolean; active: boolean };
type StudentRow = { id: string; name: string; email: string };

export function AdminGamificationControls({ enabled: initialEnabled, catalog: initialCatalog, challenges: initialChallenges, students }: { enabled: boolean; catalog: CatalogRow[]; challenges: ChallengeRow[]; students: StudentRow[] }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [catalog, setCatalog] = useState(initialCatalog);
  const [challenges, setChallenges] = useState(initialChallenges);
  const [busy, setBusy] = useState("");
  const [award, setAward] = useState({ studentId: students[0]?.id || "", xp: 0, brushes: 0, reason: "" });

  async function update(body: Record<string, unknown>, key: string) {
    setBusy(key);
    try {
      const response = await fetch("/api/admin/gamification", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Update failed");
      toast.success("Game system updated");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
      return false;
    } finally { setBusy(""); }
  }

  async function toggleGame() {
    const next = !enabled;
    if (await update({ action: "toggle", enabled: next }, "toggle")) setEnabled(next);
  }

  async function saveCatalog(item: CatalogRow) {
    await update({ action: "catalog", itemId: item.id, price: item.price, minimumLevel: item.minimum_level, active: item.active }, `item:${item.id}`);
  }

  async function saveChallenge(item: ChallengeRow) {
    await update({ action: "challenge", challengeId: item.id, active: item.active, approved: item.approved, rewardXp: item.reward_xp, rewardBrushes: item.reward_brushes }, `challenge:${item.id}`);
  }

  async function sendAward(event: React.FormEvent) {
    event.preventDefault();
    if (await update({ action: "award", ...award }, "award")) setAward((current) => ({ ...current, xp: 0, brushes: 0, reason: "" }));
  }

  return <>
    <section className="surface game-master-switch"><div><span className="eyebrow">Master switch</span><h2>Student game experience</h2><p>Pause new rewards and challenges without removing anyone’s earned progress or studio items.</p></div><button className={`game-toggle ${enabled ? "on" : ""}`} type="button" onClick={toggleGame} disabled={busy === "toggle"} aria-pressed={enabled}><span />{enabled ? "Active" : "Paused"}</button></section>

    <section className="surface admin-award-panel"><div><Sparkles size={24} /><div><h2>Recognise studio effort</h2><p>Award a discretionary bonus for effort Benjamin observed outside an automatic school event.</p></div></div><form onSubmit={sendAward}><label>Student<select value={award.studentId} onChange={(event) => setAward({ ...award, studentId: event.target.value })} required>{students.map((student) => <option value={student.id} key={student.id}>{student.name} · {student.email}</option>)}</select></label><label>XP<input type="number" min="0" max="10000" value={award.xp} onChange={(event) => setAward({ ...award, xp: Number(event.target.value) })} /></label><label>Gold Brushes<input type="number" min="0" max="10000" value={award.brushes} onChange={(event) => setAward({ ...award, brushes: Number(event.target.value) })} /></label><label className="award-reason">Reason<input value={award.reason} onChange={(event) => setAward({ ...award, reason: event.target.value })} placeholder="Exceptional observation study" required /></label><button className="button" disabled={busy === "award" || !award.studentId} type="submit"><Coins size={15} /> Award</button></form></section>

    <div className="content-title"><h2>Reward Shop</h2><span>Set prices and artist-level requirements</span></div>
    <div className="game-admin-list">{catalog.map((item, index) => <article className="surface game-admin-row" key={item.id}><div><span className="eyebrow">{item.category}</span><h3>{item.name}</h3></div><label>Brushes<input type="number" min="0" value={item.price} onChange={(event) => setCatalog((rows) => rows.map((row, i) => i === index ? { ...row, price: Number(event.target.value) } : row))} /></label><label>Level<input type="number" min="1" value={item.minimum_level} onChange={(event) => setCatalog((rows) => rows.map((row, i) => i === index ? { ...row, minimum_level: Number(event.target.value) } : row))} /></label><label className="check-label"><input type="checkbox" checked={item.active} onChange={(event) => setCatalog((rows) => rows.map((row, i) => i === index ? { ...row, active: event.target.checked } : row))} />Available</label><button className="icon-button" title="Save shop item" type="button" disabled={busy === `item:${item.id}`} onClick={() => saveCatalog(item)}><Save size={16} /></button></article>)}</div>

    <div className="content-title"><h2>Lesson challenges</h2><span>{challenges.filter((item) => item.approved && item.active).length} live challenges</span></div>
    <div className="game-admin-list challenge-admin-list">{challenges.map((item, index) => <article className="surface game-admin-row" key={item.id}><div><span className="eyebrow">{item.lesson_code}</span><h3>{item.title}</h3></div><label>XP<input type="number" min="0" value={item.reward_xp} onChange={(event) => setChallenges((rows) => rows.map((row, i) => i === index ? { ...row, reward_xp: Number(event.target.value) } : row))} /></label><label>Brushes<input type="number" min="0" value={item.reward_brushes} onChange={(event) => setChallenges((rows) => rows.map((row, i) => i === index ? { ...row, reward_brushes: Number(event.target.value) } : row))} /></label><label className="check-label"><input type="checkbox" checked={item.approved} onChange={(event) => setChallenges((rows) => rows.map((row, i) => i === index ? { ...row, approved: event.target.checked } : row))} />Approved</label><label className="check-label"><input type="checkbox" checked={item.active} onChange={(event) => setChallenges((rows) => rows.map((row, i) => i === index ? { ...row, active: event.target.checked } : row))} />Live</label><button className="icon-button" title="Save challenge" type="button" disabled={busy === `challenge:${item.id}`} onClick={() => saveChallenge(item)}><Gamepad2 size={16} /></button></article>)}</div>
  </>;
}
