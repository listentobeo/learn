"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function AdminLoginForm({ demoAllowed }: { demoAllowed: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const demo = !createClient();

  if (demo && !demoAllowed) {
    return <div className="settings-note" style={{ marginTop: 28 }}>Administrator login is unavailable until the Supabase environment variables are configured.</div>;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      const response = await fetch("/api/admin/demo-login", { method: "POST" });
      if (!response.ok) {
        toast.error("Unable to open the admin preview.");
        setLoading(false);
        return;
      }
      router.push("/admin");
      router.refresh();
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      toast.error(error?.message || "Unable to sign in.");
      setLoading(false);
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
    if (profile?.role !== "admin") {
      await supabase.auth.signOut();
      toast.error("This account does not have administrator access.");
      setLoading(false);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <form className="form" onSubmit={submit}>
      {!demo && <>
        <div className="field"><label htmlFor="admin-email">Admin email</label><input className="input" id="admin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></div>
        <div className="field"><label htmlFor="admin-password">Password</label><input className="input" id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /></div>
      </>}
      <button className="button" disabled={loading}>{loading ? "Checking access…" : demo ? "Preview admin dashboard" : "Enter admin dashboard"}</button>
      <p className="form-foot">{demo ? "Demo mode is active. Production requires an administrator account." : "Only approved Beo School administrators can continue."}</p>
    </form>
  );
}
