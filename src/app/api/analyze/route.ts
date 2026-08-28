import { NextRequest, NextResponse } from "next/server";
import { analyzeSentence } from "@/features/lingubreak/lib/ai-providers";
import {
  DEFAULT_AI_PROVIDER,
  isAIProvider,
  type AIProvider,
} from "@/features/lingubreak/lib/providers";

interface AnalyzeRequestBody {
  sentence?: unknown;
  provider?: unknown;
}

/** Public LinguBreak sentence analysis endpoint for the demo. */
export async function POST(request: NextRequest) {
  let body: AnalyzeRequestBody;

  try {
    const parsed = (await request.json()) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("INVALID_JSON_BODY");
    }
    body = parsed as AnalyzeRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Please provide a valid JSON request body." },
      { status: 400 },
    );
  }

  const { sentence, provider = DEFAULT_AI_PROVIDER } = body;

  if (typeof sentence !== "string" || sentence.trim().length === 0) {
    return NextResponse.json(
      { error: "Please provide a valid English sentence." },
      { status: 400 },
    );
  }

  const trimmedSentence = sentence.trim();
  if (trimmedSentence.length > 500) {
    return NextResponse.json(
      { error: "Sentence is too long. Please keep it under 500 characters." },
      { status: 400 },
    );
  }

  if (!isAIProvider(provider)) {
    return NextResponse.json(
      { error: "Unsupported AI provider. Choose gemini." },
      { status: 400 },
    );
  }

  try {
    const selectedProvider: AIProvider = provider;
    const data = await analyzeSentence(trimmedSentence, selectedProvider);
    return NextResponse.json(data);
  } catch (error) {
    console.error("AI Analysis Error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to analyze sentence.";
    const normalizedMessage = message.toLowerCase();

    // Detect specific error types for better UX
    if (
      normalizedMessage.includes("429") ||
      normalizedMessage.includes("quota") ||
      normalizedMessage.includes("rate limit") ||
      normalizedMessage.includes("too many requests") ||
      normalizedMessage.includes("resource has been exhausted")
    ) {
      return NextResponse.json(
        { error: "Rate limit reached. Please wait a moment and try again." },
        { status: 429 },
      );
    }

    if (
      normalizedMessage.includes("401") ||
      normalizedMessage.includes("api key") ||
      normalizedMessage.includes("auth")
    ) {
      return NextResponse.json(
        { error: "The selected analysis provider is not configured correctly." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Failed to analyze sentence. Please try again." },
      { status: 500 },
    );
  }
}
