import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running the curriculum audit.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await supabase.from("curriculum_audit_issues").select("track,lesson_code,issue,detail").order("track").order("lesson_code");
if (error) {
  console.error(error.message);
  process.exit(1);
}
if (data.length) {
  console.table(data);
  console.error(`Curriculum audit failed with ${data.length} issue${data.length === 1 ? "" : "s"}.`);
  process.exit(1);
}
console.log("Curriculum audit passed: all 32 required lessons have complete content, three questions, approved explanations, videos, and in-app assignment wording.");
