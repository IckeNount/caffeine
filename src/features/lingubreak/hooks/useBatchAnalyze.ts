"use client";

import { useCallback, useState } from "react";
import {
  BatchAnalysisResponseSchema,
  type BatchAnalysisResponse,
} from "@/features/lingubreak/lib/batch-schema";

export function useBatchAnalyze() {
  const [response, setResponse] = useState<BatchAnalysisResponse | null>(null);
  const [analyzedText, setAnalyzedText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (sentences: string[], reviewedText: string) => {
    setLoading(true);
    setError(null);
    setResponse(null);
    setAnalyzedText(null);

    try {
      const request = await fetch("/api/analyze-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentences, provider: "gemini" }),
      });
      const body = (await request.json()) as { error?: unknown };
      if (!request.ok) {
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "Could not break down these sentences.",
        );
      }
      setResponse(BatchAnalysisResponseSchema.parse(body));
      setAnalyzedText(reviewedText);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not break down these sentences.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResponse(null);
    setAnalyzedText(null);
    setLoading(false);
    setError(null);
  }, []);

  return { response, analyzedText, loading, error, analyze, reset };
}
