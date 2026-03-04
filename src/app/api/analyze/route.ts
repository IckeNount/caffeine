import { NextRequest, NextResponse } from "next/server";
import { analyzeSentence, AIProvider } from "@/features/lingubreak/lib/ai-providers";

export async function POST(request: NextRequest) {
  try {
    const { sentence, provider = "deepseek" } = await request.json();

    if (!sentence || typeof sentence !== "string" || sentence.trim().length === 0) {
      return NextResponse.json(
        { error: "Please provide a valid English sentence." },
        { status: 400 }
      );
    }

    if (sentence.length > 500) {
      return NextResponse.json(
        { error: "Sentence is too long. Please keep it under 500 characters." },
        { status: 400 }
      );
    }

    const validProviders: AIProvider[] = ["deepseek", "gemini"];
    const selectedProvider: AIProvider = validProviders.includes(provider)
      ? provider
      : "deepseek";

    const data = await analyzeSentence(sentence.trim(), selectedProvider);
    return NextResponse.json(data);
  } catch (error) {
    console.error("AI Analysis Error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to analyze sentence.";

    // Detect specific error types for better UX
    if (message.includes("429") || message.includes("quota") || message.includes("rate")) {
      return NextResponse.json(
        { error: "Rate limit reached. Please wait a moment and try again, or switch AI provider." },
        { status: 429 }
      );
    }

    if (message.includes("401") || message.includes("API key") || message.includes("auth")) {
      return NextResponse.json(
        { error: "Invalid API key. Please check your environment configuration." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to analyze sentence. Please try again." },
      { status: 500 }
    );
  }
}
