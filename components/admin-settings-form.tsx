"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function AdminSettingsForm({ name, email }: { name: string; email: string }) {
  const [adminName, setAdminName] = useState(name);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      toast.success("Demo admin settings saved.");
      setLoading(false);
      return;
    }
    const { error: profileError } = await supabase.rpc("update_own_profile_name", { new_name: adminName });
    const { error: passwordError } = password ? await supabase.auth.updateUser({ password }) : { error: null };
    if (profileError || passwordError) toast.error(profileError?.message || passwordError?.message || "Unable to save settings.");
    else {
      toast.success("Admin settings updated.");
      setPassword("");
    }
    setLoading(false);
  }

  return (
    <form className="surface form" onSubmit={save} style={{ marginTop: 0 }}>
      <h2>Administrator account</h2>
      <div className="field"><label htmlFor="admin-name">Display name</label><input className="input" id="admin-name" value={adminName} onChange={(event) => setAdminName(event.target.value)} required /></div>
      <div className="field"><label htmlFor="admin-settings-email">Login email</label><input className="input" id="admin-settings-email" value={email} disabled /></div>
      <div className="field"><label htmlFor="admin-new-password">New password <span className="subtle">(optional)</span></label><input className="input" id="admin-new-password" type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></div>
      <button className="button" disabled={loading}>{loading ? "Saving…" : "Save admin settings"}</button>
    </form>
  );
}
