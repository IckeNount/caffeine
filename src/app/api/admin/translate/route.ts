import { NextRequest, NextResponse } from "next/server";
import { requireTeacher, AuthError } from "@/shared/lib/auth/auth";
import {
  translateSentence,
  type TranslationProvider,
} from "@/shared/lib/translation";

// POST /api/admin/translate — Translate a single sentence (synchronous)
export async function POST(request: NextRequest) {
  try {
    await requireTeacher();
    const { text, provider = "gemini" } = await request.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    if (text.length > 2000) {
      return NextResponse.json(
        { error: "Text too long. Use bulk translation for large content." },
        { status: 400 },
      );
    }

    const validProviders: TranslationProvider[] = ["gemini", "deepseek"];
    const selectedProvider: TranslationProvider = validProviders.includes(
      provider,
    )
      ? provider
      : "gemini";

    const result = await translateSentence(text.trim(), selectedProvider);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Translation error:", error);

    const message =
      error instanceof Error ? error.message : "Translation failed";
    if (message.includes("429") || message.includes("rate")) {
      return NextResponse.json(
        { error: "Rate limit reached. Wait a moment or switch provider." },
        { status: 429 },
      );
    }

    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
