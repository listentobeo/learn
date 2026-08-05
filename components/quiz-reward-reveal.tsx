"use client";

import { Award, Check, Coins, Crown, Sparkles, Star, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Reward = { label: string; xp: number; brushes: number };

export function QuizRewardReveal({ score, total, attempt, rewards, previousBest, profile, onReview, onRetake }: {
  score: number;
  total: number;
  attempt: number;
  rewards: Reward[];
  previousBest: number;
  profile?: { lifetime_xp: number; gold_brush_balance: number; current_level: number } | null;
  onReview: () => void;
  onRetake: () => void;
}) {
  const [stage, setStage] = useState(0);
  const earned = useMemo(() => rewards.reduce((sum, reward) => ({ xp: sum.xp + reward.xp, brushes: sum.brushes + reward.brushes }), { xp: 0, brushes: 0 }), [rewards]);
  const improved = score > previousBest;
  useEffect(() => {
    const timers = [350, 850, 1350, 1850].map((delay, index) => window.setTimeout(() => setStage(index + 1), delay));
    return () => timers.forEach(window.clearTimeout);
  }, []);

  return <section className="quiz-reward-screen surface" aria-live="polite">
    <div className="reward-confetti" aria-hidden="true">{Array.from({length:18}).map((_,index) => <i key={index} style={{"--i":index} as React.CSSProperties} />)}</div>
    <div className={`reward-score-card ${stage >= 1 ? "revealed" : ""}`}>
      <div className="reward-trophy"><Trophy /></div><span>Quiz complete · Attempt {attempt}</span><h2>Your score</h2><strong>{score} <small>/ {total}</small></strong>
      <div className="reward-stars">{Array.from({length:total}).map((_,index) => <Star key={index} className={index < score ? "earned" : ""} fill={index < score ? "currentColor" : "none"} />)}</div>
    </div>
    <div className="reward-sequence">
      <article className={stage >= 2 ? "revealed" : ""}><Sparkles /><span>XP earned</span><strong>+{earned.xp}</strong><small>{improved ? "Your best result improved" : "Rewards only count new progress"}</small></article>
      <article className={stage >= 3 ? "revealed" : ""}><Coins /><span>Gold Brushes</span><strong>+{earned.brushes}</strong><small>Spend these inside your studio</small></article>
      <article className={stage >= 4 ? "revealed" : ""}><Crown /><span>Artist level</span><strong>{profile?.current_level || 1}</strong><small>{profile?.lifetime_xp.toLocaleString() || "—"} lifetime XP</small></article>
    </div>
    <div className={`reward-breakdown ${stage >= 4 ? "revealed" : ""}`}>
      <h3>{score === total ? "Perfect mastery" : score > previousBest ? "New progress banked" : "Practice completed"}</h3>
      {rewards.length ? rewards.map((reward) => <div key={reward.label}><Check /><span>{reward.label}</span><strong>+{reward.xp} XP · +{reward.brushes} brushes</strong></div>) : <p>You already earned the rewards for this score. Improve your best score to earn the difference.</p>}
      {profile && <footer><Award /><span>Wallet after this quiz</span><strong>{profile.gold_brush_balance} Gold Brushes</strong></footer>}
    </div>
    <div className="quiz-actions reward-actions"><button className="button ghost" type="button" onClick={onRetake}>Retake quiz</button><button className="button" type="button" onClick={onReview}>Review answers</button></div>
  </section>;
}
