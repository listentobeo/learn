"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Track } from "@/lib/types";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [track, setTrack] = useState<Track>((params.get("track") as Track) || "Drawing");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      toast.success(mode === "login" ? "Welcome back — opening the demo." : "Your demo account is ready.");
      router.push(mode === "login" ? "/dashboard" : `/checkout?track=${track}`);
      return;
    }

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { toast.error(error.message); setLoading(false); return; }
      router.push("/dashboard");
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name, track } },
      });
      if (error) { toast.error(error.message); setLoading(false); return; }
      await fetch("/api/auth/welcome", { method: "POST" }).catch(() => undefined);
      toast.success("Account created. Now choose your payment plan.");
      router.push(`/checkout?track=${track}`);
    }
    router.refresh();
  }

  return (
    <form className="form" onSubmit={submit}>
      {mode === "signup" && (
        <>
          <div className="field"><label htmlFor="name">Full name</label><input className="input" id="name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" placeholder="Your full name" /></div>
          <div className="field"><label htmlFor="track">Learning track</label><select className="input" id="track" value={track} onChange={(e) => setTrack(e.target.value as Track)}><option>Drawing</option><option>Painting</option><option>Discovery</option></select></div>
        </>
      )}
      <div className="field"><label htmlFor="email">Email address</label><input className="input" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" /></div>
      <div className="field"><label htmlFor="password">Password</label><input className="input" id="password" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="At least 6 characters" /></div>
      <button className="button" disabled={loading} type="submit">{loading ? "Please wait…" : mode === "login" ? "Enter the school" : "Create my account"}</button>
      <div className="form-foot">
        {mode === "login" ? <>New to Beo? <Link className="gold-link" href="/signup">Create an account</Link></> : <>Already enrolled? <Link className="gold-link" href="/login">Sign in</Link></>}
      </div>
    </form>
  );
}
