import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const adminLogin = path === "/admin/login";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    const demoAdmin = process.env.NODE_ENV !== "production" && request.cookies.get("beo_admin_demo")?.value === "1";
    if (path.startsWith("/admin") && !adminLogin && !demoAdmin) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    if (adminLogin && demoAdmin) return NextResponse.redirect(new URL("/admin", request.url));
    return NextResponse.next();
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies: { name: string; value: string; options: CookieOptions }[]) {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && path.startsWith("/admin") && !adminLogin) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  if (!user && (path.startsWith("/dashboard") || path.startsWith("/lesson") || path.startsWith("/resources") || path.startsWith("/settings"))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (user && path.startsWith("/admin")) {
    const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (adminLogin && data?.role === "admin") return NextResponse.redirect(new URL("/admin", request.url));
    if (data?.role !== "admin") return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return response;
}

export const config = { matcher: ["/dashboard/:path*", "/lesson/:path*", "/resources/:path*", "/settings/:path*", "/admin/:path*"] };
