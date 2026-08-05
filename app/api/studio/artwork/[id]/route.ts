import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Studio artwork requires Supabase" }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: assignment, error } = await supabase.from("assignments").select("file_path").eq("id", id).eq("student_id", user.id).maybeSingle();
  if (error || !assignment?.file_path) return NextResponse.json({ error: "Artwork not found" }, { status: 404 });
  const { data: file, error: downloadError } = await supabase.storage.from("assignments").download(assignment.file_path);
  if (downloadError || !file) return NextResponse.json({ error: "Artwork file is unavailable" }, { status: 404 });
  const extension = assignment.file_path.split(".").pop()?.toLowerCase();
  const inferredTypes: Record<string,string> = { jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",gif:"image/gif",avif:"image/avif" };
  const contentType = file.type.startsWith("image/") ? file.type : extension ? inferredTypes[extension] : undefined;
  if (!contentType) return NextResponse.json({ error: "Artwork is not a supported web image" }, { status: 415 });
  return new Response(file, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=300, stale-while-revalidate=600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
