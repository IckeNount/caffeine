import { NextResponse } from "next/server";
import { createServerClient } from "@/shared/lib/db/supabase-server";

// Google SSO callback handler
// After the user authenticates with Google, Supabase redirects here
// with a `code` query parameter that we exchange for a session.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If we get here, something went wrong — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
