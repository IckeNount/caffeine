"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/shared/lib/db/supabase-browser";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);

    const { error } = await getSupabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div
      className='min-h-screen flex items-center justify-center px-4'
      style={{ backgroundColor: "var(--bg-primary, #0A0A0F)" }}
    >
      {/* Subtle background glow */}
      <div
        className='fixed inset-0 pointer-events-none'
        style={{
          background:
            "radial-gradient(ellipse 50% 50% at 50% 40%, rgba(255,229,0,0.04), transparent)",
        }}
      />

      <div className='relative z-10 w-full max-w-md'>
        {/* Logo */}
        <div className='text-center mb-8'>
          <div
            className='inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 text-2xl font-bold'
            style={{
              background: "linear-gradient(135deg, #FFE500, #FF9500)",
              color: "#0A0A0F",
            }}
          >
            C
          </div>
          <h1
            className='text-2xl font-bold'
            style={{ color: "var(--text-primary, #F1F1F3)" }}
          >
            Caffeine Admin
          </h1>
          <p
            className='mt-2 text-sm'
            style={{ color: "var(--text-muted, #6B6F80)" }}
          >
            Sign in to manage your lessons and content
          </p>
        </div>

        {/* Login Card */}
        <div
          className='rounded-2xl p-8'
          style={{
            backgroundColor: "var(--bg-secondary, #111217)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {error && (
            <div
              className='mb-4 p-3 rounded-lg text-sm'
              style={{
                backgroundColor: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#FCA5A5",
              }}
            >
              {error}
            </div>
          )}

          {/* Google SSO Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className='w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed'
            style={{
              backgroundColor: "#FFF",
              color: "#1F2937",
            }}
          >
            <svg width='20' height='20' viewBox='0 0 24 24'>
              <path
                d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z'
                fill='#4285F4'
              />
              <path
                d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                fill='#34A853'
              />
              <path
                d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                fill='#FBBC05'
              />
              <path
                d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                fill='#EA4335'
              />
            </svg>
            {loading ? "Signing in..." : "Continue with Google"}
          </button>

          <div className='flex items-center gap-3 my-6'>
            <div
              className='flex-1 h-px'
              style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
            />
            <span
              className='text-xs'
              style={{ color: "var(--text-muted, #6B6F80)" }}
            >
              or
            </span>
            <div
              className='flex-1 h-px'
              style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
            />
          </div>

          {/* Email hint */}
          <p
            className='text-center text-xs'
            style={{ color: "var(--text-muted, #6B6F80)" }}
          >
            Use your school Google account to sign in.
            <br />
            Teacher accounts are created automatically.
          </p>
        </div>

        {/* Back to student view */}
        <div className='mt-6 text-center'>
          <Link
            href='/'
            className='text-xs transition-colors hover:underline'
            style={{ color: "var(--text-muted, #6B6F80)" }}
          >
            ← Back to Student View
          </Link>
        </div>
      </div>
    </div>
  );
}
