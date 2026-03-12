"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchLesson } from "@/shared/lib/lessons/lesson-api";
import type { LessonDetail } from "@/shared/types/lesson-types";

interface UseLessonState {
  lesson: LessonDetail | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for fetching a single lesson with all its segments.
 * Pass the lesson ID; returns lesson data, loading, and error state.
 */
export function useLesson(id: string) {
  const [state, setState] = useState<UseLessonState>({
    lesson: null,
    isLoading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState({ lesson: null, isLoading: true, error: null });
    try {
      const data = await fetchLesson(id);
      setState({ lesson: data.lesson, isLoading: false, error: null });
    } catch (err) {
      setState({
        lesson: null,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to load lesson",
      });
    }
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setState({ lesson: null, isLoading: true, error: null });
      try {
        const data = await fetchLesson(id);
        if (!cancelled) {
          setState({ lesson: data.lesson, isLoading: false, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            lesson: null,
            isLoading: false,
            error: err instanceof Error ? err.message : "Failed to load lesson",
          });
        }
      }
    }

    run();
    return () => { cancelled = true; };
  }, [id]);

  return { ...state, refetch: load };
}
