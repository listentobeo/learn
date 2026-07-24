"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export function SettingsForm({ profile }: { profile: Profile }) {
  const [name, setName] = useState(profile.name);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      toast.success("Demo settings saved.");
      setLoading(false);
      return;
    }
    const { error: profileError } = await supabase.rpc("update_own_profile_name", { new_name: name });
    const { error: passwordError } = password ? await supabase.auth.updateUser({ password }) : { error: null };
    if (profileError || passwordError) toast.error(profileError?.message || passwordError?.message || "We could not save every change.");
    else {
      toast.success("Settings updated.");
      setPassword("");
    }
    setLoading(false);
  }

  return (
    <form className="surface form" onSubmit={save} style={{ marginTop: 0 }}>
      <h2>Profile details</h2>
      <div className="field"><label htmlFor="settings-name">Full name</label><input className="input" id="settings-name" value={name} onChange={(event) => setName(event.target.value)} required /></div>
      <div className="field"><label htmlFor="settings-email">Email address</label><input className="input" id="settings-email" value={profile.email} disabled /></div>
      <div className="field"><label htmlFor="settings-track">Primary track</label><input className="input" id="settings-track" value={profile.track} disabled /></div>
      <div className="field"><label htmlFor="settings-password">New password <span className="subtle">(optional)</span></label><input className="input" id="settings-password" type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Leave blank to keep your password" /></div>
      <button className="button" disabled={loading}>{loading ? "Saving…" : "Save changes"}</button>
    </form>
  );
}
