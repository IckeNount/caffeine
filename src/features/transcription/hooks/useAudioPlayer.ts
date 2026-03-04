"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { TranscriptionSegment } from "@/shared/lib/transcription";

interface UseAudioPlayerReturn {
  /** Whether audio is currently playing. */
  isPlaying: boolean;
  /** Current playback position in seconds. */
  currentTime: number;
  /** Total audio duration in seconds. */
  duration: number;
  /** Index of the currently active segment (-1 if none). */
  activeSegmentIndex: number;
  /** Start or resume playback. */
  play: () => void;
  /** Pause playback. */
  pause: () => void;
  /** Toggle play/pause. */
  togglePlay: () => void;
  /** Seek to a specific time in seconds. */
  seek: (time: number) => void;
  /** Set the audio source URL (blob URL or remote URL). */
  setAudioSrc: (url: string) => void;
  /** Whether audio is ready to play. */
  isReady: boolean;
}

/**
 * Hook that wraps HTMLAudioElement with rAF-based time tracking
 * and derives the active segment index from the current playback position.
 */
export function useAudioPlayer(
  segments: TranscriptionSegment[]
): UseAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(-1);
  const [isReady, setIsReady] = useState(false);

  // Create audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;

    const onLoaded = () => {
      setDuration(audio.duration || 0);
      setIsReady(true);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setActiveSegmentIndex(-1);
    };

    const onError = () => {
      setIsPlaying(false);
      setIsReady(false);
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.pause();
      audio.src = "";
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // rAF loop for smooth time tracking — use ref to avoid self-reference
  const tickRef = useRef<() => void>(() => {});

  useEffect(() => {
    tickRef.current = () => {
      const audio = audioRef.current;
      if (!audio || audio.paused) return;

      const t = audio.currentTime;
      setCurrentTime(t);

      // Find the active segment
      const idx = segments.findIndex(
        (seg) => t >= seg.start && t < seg.end
      );
      setActiveSegmentIndex(idx);

      rafRef.current = requestAnimationFrame(tickRef.current);
    };
  }, [segments]);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;

    audio.play().then(() => {
      setIsPlaying(true);
      rafRef.current = requestAnimationFrame(tickRef.current);
    }).catch((err) => {
      console.error("[AudioPlayer] Play failed:", err);
    });
  }, []);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    setIsPlaying(false);
    cancelAnimationFrame(rafRef.current);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback(
    (time: number) => {
      const audio = audioRef.current;
      if (!audio) return;

      audio.currentTime = time;
      setCurrentTime(time);

      // Update active segment immediately
      const idx = segments.findIndex(
        (seg) => time >= seg.start && time < seg.end
      );
      setActiveSegmentIndex(idx);
    },
    [segments]
  );

  const setAudioSrc = useCallback((url: string) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    cancelAnimationFrame(rafRef.current);
    setIsPlaying(false);
    setCurrentTime(0);
    setActiveSegmentIndex(-1);
    setIsReady(false);

    audio.src = url;
    audio.load();
  }, []);

  return {
    isPlaying,
    currentTime,
    duration,
    activeSegmentIndex,
    play,
    pause,
    togglePlay,
    seek,
    setAudioSrc,
    isReady,
  };
}
