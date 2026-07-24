"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ admin = false }: { admin?: boolean }) {
  const router = useRouter();
  async function signOut() {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    else if (admin) await fetch("/api/admin/demo-logout", { method: "POST" });
    router.push(admin ? "/admin/login" : "/login");
    router.refresh();
  }
  return <button className="icon-button" onClick={signOut} aria-label="Sign out"><LogOut size={17} /></button>;
}
