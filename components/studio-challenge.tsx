"use client";

import { CheckCircle2, Coins, Gamepad2, RotateCcw, Sparkles, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { StudioChallenge as StudioChallengeType } from "@/lib/types";

export function StudioChallenge({ challenge, demo = false }: { challenge: StudioChallengeType; demo?: boolean }) {
  const options = challenge.config.options || challenge.config.items || [];
  const targets = challenge.config.targets || [];
  const initialAnswer = () => challenge.challenge_type === "quick_choice" ? "" : challenge.challenge_type === "sort_match" ? {} : [];
  const [answer, setAnswer] = useState<string | string[] | Record<string, string>>(initialAnswer);
  const [result, setResult] = useState<{ correct: boolean; explanation: string; correctAnswer?: unknown; reward?: { awarded?: boolean }; correctionReward?: { awarded?: boolean }; already?: boolean } | null>(challenge.completed ? { correct: true, explanation: "You already completed this Studio Challenge.", already: true } : null);
  const [submitting, setSubmitting] = useState(false);
  const complete = typeof answer === "string" ? Boolean(answer) : Array.isArray(answer) ? answer.length === options.length : Object.keys(answer).length === options.length;

  function chooseSequence(id: string) {
    setAnswer((current) => {
      const sequence = Array.isArray(current) ? current : [];
      return sequence.includes(id) ? sequence.filter((item) => item !== id) : [...sequence, id];
    });
  }

  function chooseMatch(itemId: string, targetId: string) {
    setAnswer((current) => ({ ...(Array.isArray(current) || typeof current === "string" ? {} : current), [itemId]: targetId }));
  }

  async function submit() {
    if (!complete) return;
    setSubmitting(true);
    if (demo) {
      const correct = answer === "a" || (Array.isArray(answer) && answer.join(",") === options.map((option) => option.id).join(",")) || (!Array.isArray(answer) && typeof answer === "object" && Object.keys(answer).length === options.length);
      setResult({ correct, explanation: correct ? "Challenge complete. Your observation is ready for the knowledge check." : "Look at the lesson idea once more, then try the correction round." });
      setSubmitting(false);
      return;
    }
    try {
      const response = await fetch("/api/gamification/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challenge.id, answer }),
      });
      const data = await response.json();
      if (!response.ok) return toast.error(data.error || "Unable to check this Studio Challenge.");
      setResult(data);
      if (data.correct) toast.success(data.correctionReward?.awarded ? "Correction mastered. Bonus reward earned." : "Studio Challenge complete.");
    } catch {
      toast.error("Your connection changed. Try the challenge again.");
    } finally {
      setSubmitting(false);
    }
  }

  function retry() {
    setAnswer(initialAnswer());
    setResult(null);
  }

  if (result?.correct) {
    return (
      <section className="surface studio-challenge challenge-complete">
        <div className="challenge-icon"><CheckCircle2 size={24} /></div>
        <div><span className="eyebrow">Studio Challenge mastered</span><h2>{challenge.title}</h2><p>{result.explanation}</p></div>
        {!result.already && <div className="challenge-rewards"><span><Sparkles size={15} /> +{challenge.reward_xp} XP</span><span><Coins size={15} /> +{challenge.reward_brushes} Gold Brushes</span></div>}
      </section>
    );
  }

  return (
    <section className="surface studio-challenge">
      <div className="challenge-heading"><div className="challenge-icon"><Gamepad2 size={22} /></div><div><span className="eyebrow">Practice before the knowledge check</span><h2>{challenge.title}</h2></div><div className="challenge-rewards"><span><Sparkles size={14} /> {challenge.reward_xp} XP</span><span><Coins size={14} /> {challenge.reward_brushes}</span></div></div>
      <p className="challenge-prompt">{challenge.prompt}</p>
      {result && !result.correct && <div className="challenge-correction"><XCircle size={18} /><div><strong>Correction round</strong><p>{result.explanation}</p>{Boolean(result.correctAnswer) && <small>The lesson answer is <b>{String(result.correctAnswer).toUpperCase()}</b>. Choose it below to confirm the idea.</small>}</div></div>}
      {challenge.challenge_type === "sort_match" ? <div className="challenge-match-grid">{options.map((option) => <label key={option.id}><strong>{option.label}</strong><select value={!Array.isArray(answer) && typeof answer === "object" ? answer[option.id] || "" : ""} onChange={(event) => chooseMatch(option.id, event.target.value)}><option value="">Choose a group</option>{targets.map((target) => <option value={target.id} key={target.id}>{target.label}</option>)}</select></label>)}</div> : <div className={challenge.challenge_type === "quick_choice" ? "challenge-options" : "challenge-sequence"}>
        {options.map((option, index) => {
          const selected = typeof answer === "string" ? answer === option.id : Array.isArray(answer) && answer.includes(option.id);
          const order = Array.isArray(answer) ? answer.indexOf(option.id) + 1 : 0;
          return <button type="button" className={selected ? "selected" : ""} onClick={() => challenge.challenge_type === "quick_choice" ? setAnswer(option.id) : chooseSequence(option.id)} key={option.id}>{challenge.challenge_type !== "quick_choice" && <span>{order || index + 1}</span>}<strong>{option.label}</strong></button>;
        })}
      </div>}
      <div className="challenge-actions">{result && !result.correct && <button className="button ghost" type="button" onClick={retry}><RotateCcw size={15} /> Reset choices</button>}<button className="button" type="button" disabled={!complete || submitting} onClick={submit}>{submitting ? "Checking…" : result ? "Complete correction" : "Check my choice"}</button></div>
    </section>
  );
}
