"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DictionaryLookupResultSchema,
  type DictionaryLookupResult,
} from "../lib/schema";

export type DictionaryStatus =
  | "idle"
  | "loading"
  | "success"
  | "not-found"
  | "error";

export interface DictionaryState {
  selectedWord: string | null;
  status: DictionaryStatus;
  result: DictionaryLookupResult | null;
  error: string | null;
  selectWord: (word: string) => void;
  retry: () => void;
}

const NOT_FOUND_MESSAGE =
  "ไม่พบคำนี้ ลองแตะคำอื่นนะ · We couldn't find this word.";
const ERROR_MESSAGE =
  "พจนานุกรมยังไม่พร้อม ลองอีกครั้งได้เลย · Dictionary unavailable. Please retry.";

export function useDictionaryLookup(): DictionaryState {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [status, setStatus] = useState<DictionaryStatus>("idle");
  const [result, setResult] = useState<DictionaryLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef(new Map<string, DictionaryLookupResult>());
  const controller = useRef<AbortController | null>(null);
  const requestId = useRef(0);

  useEffect(() => () => controller.current?.abort(), []);

  const loadWord = useCallback(async (word: string, ignoreCache = false) => {
    const normalized = word.toLowerCase();
    const cached = cache.current.get(normalized);
    if (cached && !ignoreCache) {
      setResult(cached);
      setStatus("success");
      setError(null);
      return;
    }

    controller.current?.abort();
    controller.current = new AbortController();
    const currentRequest = ++requestId.current;
    setResult(null);
    setError(null);
    setStatus("loading");

    try {
      const params = new URLSearchParams({ word: normalized });
      const response = await fetch(`/api/dictionary?${params}`, {
        signal: controller.current.signal,
      });
      const payload = (await response.json()) as unknown;
      if (currentRequest !== requestId.current) return;

      if (response.status === 404) {
        setStatus("not-found");
        setError(NOT_FOUND_MESSAGE);
        return;
      }
      if (!response.ok) throw new Error("DICTIONARY_UNAVAILABLE");

      const parsed = DictionaryLookupResultSchema.parse(payload);
      cache.current.set(normalized, parsed);
      setResult(parsed);
      setStatus("success");
    } catch (lookupError) {
      if (lookupError instanceof DOMException && lookupError.name === "AbortError") {
        return;
      }
      if (currentRequest !== requestId.current) return;
      setStatus("error");
      setError(ERROR_MESSAGE);
    }
  }, []);

  const selectWord = useCallback(
    (word: string) => {
      if (selectedWord?.toLowerCase() === word.toLowerCase()) {
        controller.current?.abort();
        requestId.current += 1;
        setSelectedWord(null);
        setStatus("idle");
        setResult(null);
        setError(null);
        return;
      }

      setSelectedWord(word);
      void loadWord(word);
    },
    [loadWord, selectedWord],
  );

  const retry = useCallback(() => {
    if (selectedWord) void loadWord(selectedWord, true);
  }, [loadWord, selectedWord]);

  return { selectedWord, status, result, error, selectWord, retry };
}
