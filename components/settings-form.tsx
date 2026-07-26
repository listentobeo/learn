"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export function SettingsForm({ profile }: { profile: Profile }) {
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone || "");
  const [parentName, setParentName] = useState(profile.parent_name || "");
  const [parentEmail, setParentEmail] = useState(profile.parent_email || "");
  const [emailNotifications, setEmailNotifications] = useState(profile.email_notifications ?? true);
  const [whatsappNotifications, setWhatsappNotifications] = useState(profile.whatsapp_notifications ?? false);
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
    const { error: profileError } = await supabase.rpc("update_own_school_preferences", {
      p_name: name,
      p_phone: phone || null,
      p_parent_name: parentName || null,
      p_parent_email: parentEmail || null,
      p_email_notifications: emailNotifications,
      p_whatsapp_notifications: whatsappNotifications,
    });
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
      <div className="field"><label htmlFor="settings-phone">WhatsApp number <span className="subtle">(include country code)</span></label><input className="input" id="settings-phone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+234…" /></div>
      <div className="form-row">
        <div className="field"><label htmlFor="settings-parent-name">Parent/guardian name <span className="subtle">(optional)</span></label><input className="input" id="settings-parent-name" value={parentName} onChange={(event) => setParentName(event.target.value)} /></div>
        <div className="field"><label htmlFor="settings-parent-email">Parent/guardian email <span className="subtle">(optional)</span></label><input className="input" id="settings-parent-email" type="email" value={parentEmail} onChange={(event) => setParentEmail(event.target.value)} /></div>
      </div>
      <div className="notification-preferences">
        <label><input type="checkbox" checked={emailNotifications} onChange={(event) => setEmailNotifications(event.target.checked)} /><span><strong>Email school reminders</strong><small>Lesson openings, assignments, feedback, calls, and payments.</small></span></label>
        <label><input type="checkbox" checked={whatsappNotifications} onChange={(event) => setWhatsappNotifications(event.target.checked)} /><span><strong>WhatsApp school reminders</strong><small>Requires the WhatsApp number above. Assignments are still uploaded inside the school.</small></span></label>
      </div>
      <div className="field"><label htmlFor="settings-password">New password <span className="subtle">(optional)</span></label><input className="input" id="settings-password" type="password" minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Leave blank to keep your password" /></div>
      <button className="button" disabled={loading}>{loading ? "Saving…" : "Save changes"}</button>
    </form>
  );
}
