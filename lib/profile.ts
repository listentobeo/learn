import { demoProfile } from "./demo-data";
import { createClient } from "./supabase/server";
import type { Profile } from "./types";

export async function getCurrentProfile(): Promise<Profile> {
  const supabase = await createClient();
  if (!supabase) return demoProfile;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return demoProfile;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return (data as Profile | null) || demoProfile;
}
