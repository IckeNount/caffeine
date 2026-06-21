import { NextRequest, NextResponse } from "next/server";
import { requireTeacher, AuthError } from "@/shared/lib/auth/auth";
import { supabaseAdmin } from "@/shared/lib/db/supabase";

function maskKey(key: string | null): string | null {
  if (!key) return null;
  return key.length < 8 ? "••••••••" : "••••••••" + key.slice(-4);
}

export async function GET() {
  try {
    const { profile } = await requireTeacher();

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("gemini_api_key, deepseek_api_key")
      .eq("id", profile.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ gemini_api_key: null, deepseek_api_key: null });
    }

    return NextResponse.json({
      gemini_api_key: maskKey(data.gemini_api_key),
      deepseek_api_key: maskKey(data.deepseek_api_key),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { profile } = await requireTeacher();
    const body = await request.json() as {
      gemini_api_key?: string | null;
      deepseek_api_key?: string | null;
    };

    const updates: Record<string, string | null> = {};
    if ("gemini_api_key" in body) {
      updates.gemini_api_key = body.gemini_api_key?.trim() || null;
    }
    if ("deepseek_api_key" in body) {
      updates.deepseek_api_key = body.deepseek_api_key?.trim() || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", profile.id);

    if (error) {
      return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
