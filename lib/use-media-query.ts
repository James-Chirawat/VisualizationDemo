"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Subscribes to a CSS media query. Server render and hydration assume `false`. */
export function useMediaQuery(query: string) {
  const subscribe = useCallback((onChange: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

export const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
export const prefersReducedMotion = () => window.matchMedia(reducedMotionQuery).matches;
