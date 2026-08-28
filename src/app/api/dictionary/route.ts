import { NextRequest, NextResponse } from "next/server";
import {
  DictionaryLookupError,
  lookupDictionary,
} from "@/features/dictionary/lib/lookup";
import { normalizeDictionaryWord } from "@/features/dictionary/lib/schema";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const word = normalizeDictionaryWord(request.nextUrl.searchParams.get("word"));
  if (!word) {
    return NextResponse.json(
      {
        error: "Please choose one English word.",
        code: "INVALID_WORD",
      },
      { status: 400 },
    );
  }

  try {
    const result = await lookupDictionary(word);
    return NextResponse.json(result, {
      headers: {
        "Cache-Control":
          "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    if (error instanceof DictionaryLookupError) {
      const notFound = error.code === "WORD_NOT_FOUND";
      return NextResponse.json(
        {
          error: notFound
            ? "We couldn't find that word. Try another word."
            : "The dictionary is unavailable right now. Please try again.",
          code: error.code,
        },
        { status: notFound ? 404 : 502 },
      );
    }

    return NextResponse.json(
      {
        error: "The dictionary is unavailable right now. Please try again.",
        code: "DICTIONARY_UNAVAILABLE",
      },
      { status: 502 },
    );
  }
}
