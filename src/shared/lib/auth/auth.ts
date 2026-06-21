import { createServerClient } from "@/shared/lib/db/supabase-server";
import { supabaseAdmin } from "@/shared/lib/db/supabase";

export type UserRole = "student" | "teacher" | "admin";

export interface UserProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: UserRole;
  gemini_api_key: string | null;
  deepseek_api_key: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get the current authenticated user (server-side).
 * Uses getUser() which validates the JWT against Supabase Auth server.
 * Returns null if not authenticated.
 */
export async function getSession() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  // Return a session-like object for backward compatibility
  return { user };
}

/**
 * Get a user's profile from the profiles table.
 */
export async function getUserProfile(
  userId: string,
): Promise<UserProfile | null> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data as UserProfile;
}

/**
 * Validate that the current request is from an authenticated teacher.
 * Returns the user profile if valid, throws descriptive errors otherwise.
 */
export async function requireTeacher(): Promise<{
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>;
  profile: UserProfile;
}> {
  const session = await getSession();

  if (!session) {
    throw new AuthError("Not authenticated", 401);
  }

  const profile = await getUserProfile(session.user.id);

  if (!profile) {
    throw new AuthError("User profile not found", 404);
  }

  if (profile.role !== "teacher" && profile.role !== "admin") {
    throw new AuthError(
      "Insufficient permissions — teacher role required",
      403,
    );
  }

  return { session, profile };
}

/**
 * Custom error class for auth failures with HTTP status codes.
 */
export class AuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}
