"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchLessons } from "@/shared/lib/lessons/lesson-api";
import type {
  Lesson,
  LessonsQueryParams,
} from "@/shared/types/lesson-types";

interface UseLessonsState {
  lessons: Lesson[];
  total: number;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for fetching and managing the published lessons list.
 * Supports filtering by folder and pagination.
 */
export function useLessons(params?: LessonsQueryParams) {
  const [state, setState] = useState<UseLessonsState>({
    lessons: [],
    total: 0,
    isLoading: true,
    error: null,
  });

  const fetchGen = useRef(0);

  // Serialise params into a stable dep key
  const paramKey = JSON.stringify({
    folder_id: params?.folder_id ?? null,
    limit: params?.limit ?? null,
    offset: params?.offset ?? null,
  });

  const load = useCallback(async () => {
    const id = ++fetchGen.current;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const data = await fetchLessons(params);
      if (id !== fetchGen.current) return;
      const lessons = Array.isArray(data.lessons) ? data.lessons : [];
      const total =
        typeof data.total === "number" ? data.total : lessons.length;
      setState({
        lessons,
        total,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      if (id !== fetchGen.current) return;
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to load lessons",
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramKey]);

  useEffect(() => {
    load();
    return () => {
      fetchGen.current++;
    };
  }, [load]);

  return { ...state, refetch: load };
}
