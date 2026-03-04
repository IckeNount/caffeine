import { NextResponse } from 'next/server';
import { fetchWordDefinition } from '@/shared/lib/dictionary/dictionary-service';
import { translateToThaiFree } from '@/shared/lib/dictionary/mymemory-service';
import { translateToThaiAI } from '@/shared/lib/dictionary/translate-service';
import { DictionaryLookupResult } from '@/features/dictionary/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const word = searchParams.get('word');
  const useAI = searchParams.get('ai') === 'true';

  if (!word) {
    return NextResponse.json(
      { error: 'Missing "word" query parameter' },
      { status: 400 }
    );
  }

  const start = Date.now();

  try {
    // Step 1: Fetch English definitions (Free Dictionary API, ~100-300ms)
    const entries = await fetchWordDefinition(word);

    // Step 2: Translate to Thai
    let thai = null;
    try {
      if (useAI) {
        // AI-enhanced: uses Gemini (consumes API quota)
        thai = await translateToThaiAI(entries);
      } else {
        // Free tier: uses MyMemory API (no key, no cost)
        thai = await translateToThaiFree(entries);
      }
    } catch (translationError) {
      console.error('[Translation fallback]', translationError);
      // If AI fails, fall back to free translation
      if (useAI) {
        try {
          thai = await translateToThaiFree(entries);
        } catch {
          // Both failed — still return English results
        }
      }
    }

    const timingMs = Date.now() - start;

    const result: DictionaryLookupResult = {
      entries,
      thai,
      timingMs,
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch definition' },
      { status: error.message?.includes('not found') ? 404 : 500 }
    );
  }
}
