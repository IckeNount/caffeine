import { NextRequest, NextResponse } from "next/server";
import { analyzeSentenceBatch } from "@/features/lingubreak/lib/batch-analysis";
import {
  BatchAnalysisRequestSchema,
  BatchInputError,
} from "@/features/lingubreak/lib/batch-schema";

export const runtime = "nodejs";

function isRateLimitError(message: string): boolean {
  const normalized = message.toLowerCase();
  return ["429", "quota", "rate limit", "too many requests", "resource has been exhausted"].some(
    (marker) => normalized.includes(marker),
  );
}

/** Analyze all reviewed, uncached OCR sentences in one Gemini generation. */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Please provide a valid JSON request body." },
      { status: 400 },
    );
  }

  const parsed = BatchAnalysisRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please review 1–10 sentences, with no sentence longer than 500 characters." },
      { status: 400 },
    );
  }

  try {
    const response = await analyzeSentenceBatch(parsed.data.sentences);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Batch Analysis Error:", error);
    if (error instanceof BatchInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Batch analysis failed.";
    if (isRateLimitError(message)) {
      return NextResponse.json(
        { error: "Rate limit reached. Please wait a moment and try again." },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { error: "Failed to break down these sentences. Please try again." },
      { status: 500 },
    );
  }
}
