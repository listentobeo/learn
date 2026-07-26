import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const adminLogin = path === "/admin/login";
  const publicAuthPath = path === "/" || path === "/login" || path === "/signup";
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
  let refreshedCookies: { name: string; value: string; options: CookieOptions }[] = [];
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies: { name: string; value: string; options: CookieOptions }[]) {
        refreshedCookies = cookies;
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const redirect = (destination: string) => {
    const redirected = NextResponse.redirect(new URL(destination, request.url));
    refreshedCookies.forEach(({ name, value, options }) => redirected.cookies.set(name, value, options));
    return redirected;
  };
  if (user && publicAuthPath) {
    const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    return redirect(data?.role === "admin" ? "/admin" : "/dashboard");
  }
  if (!user && path.startsWith("/admin") && !adminLogin) {
    return redirect("/admin/login");
  }
  if (!user && (path.startsWith("/dashboard") || path.startsWith("/lesson") || path.startsWith("/resources") || path.startsWith("/settings") || path.startsWith("/progress") || path.startsWith("/reviews") || path.startsWith("/guides"))) {
    return redirect("/login");
  }
  if (user && path.startsWith("/admin")) {
    const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (adminLogin && data?.role === "admin") return redirect("/admin");
    if (data?.role !== "admin") return redirect("/dashboard");
  }
  return response;
}

export const config = { matcher: ["/", "/login", "/signup", "/dashboard/:path*", "/lesson/:path*", "/resources/:path*", "/settings/:path*", "/progress/:path*", "/reviews/:path*", "/guides/:path*", "/admin/:path*"] };
