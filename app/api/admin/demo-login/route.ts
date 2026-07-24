import { NextResponse } from "next/server";

export async function POST() {
  if (process.env.NODE_ENV === "production" || (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    return NextResponse.json({ error: "Demo login is disabled" }, { status: 404 });
  }
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set("beo_admin_demo", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 60 * 60 * 8,
    path: "/",
  });
  return response;
}
