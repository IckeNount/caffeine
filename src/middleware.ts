import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { middlewareEnv } from "@/env/middleware-env";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require teacher authentication
const PROTECTED_PAGE_ROUTES = ["/dashboard"];
const PROTECTED_API_ROUTES = ["/api/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── 1. Refresh auth session (runs on ALL matched routes) ──────────
  // This keeps the cookie-based session alive by refreshing expired tokens.
  // MUST run before any auth checks.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    middlewareEnv.NEXT_PUBLIC_SUPABASE_URL,
    middlewareEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Forward refreshed cookies to both the request (for downstream
          // server code) and the response (for the browser).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: Do NOT add code between createServerClient and getUser().
  // A simple mistake here could cause users to be randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── 2. Check if this is a protected route ─────────────────────────
  const isProtectedPage = PROTECTED_PAGE_ROUTES.some((route) =>
    pathname.startsWith(route),
  );
  const isProtectedApi = PROTECTED_API_ROUTES.some((route) =>
    pathname.startsWith(route),
  );

  if (!isProtectedPage && !isProtectedApi) {
    return supabaseResponse;
  }

  // ── 3. Require authentication ─────────────────────────────────────
  if (!user) {
    if (isProtectedApi) {
      const errorResponse = NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
      // Carry over the refreshed cookies
      supabaseResponse.cookies
        .getAll()
        .forEach((c) => errorResponse.cookies.set(c.name, c.value));
      return errorResponse;
    }
    // Redirect to login for page routes
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    supabaseResponse.cookies
      .getAll()
      .forEach((c) => redirectResponse.cookies.set(c.name, c.value));
    return redirectResponse;
  }

  // ── 4. Verify teacher role ────────────────────────────────────────
  const adminClient = createClient(
    middlewareEnv.NEXT_PUBLIC_SUPABASE_URL,
    middlewareEnv.SUPABASE_SERVICE_ROLE_KEY,
  );

  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "teacher" && profile.role !== "admin")) {
    if (isProtectedApi) {
      const errorResponse = NextResponse.json(
        { error: "Teacher role required" },
        { status: 403 },
      );
      supabaseResponse.cookies
        .getAll()
        .forEach((c) => errorResponse.cookies.set(c.name, c.value));
      return errorResponse;
    }
    // Redirect non-teachers to the student home
    const homeRedirect = NextResponse.redirect(new URL("/", request.url));
    supabaseResponse.cookies
      .getAll()
      .forEach((c) => homeRedirect.cookies.set(c.name, c.value));
    return homeRedirect;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files, images, and favicon.
     * This ensures the session is refreshed on every navigation.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
