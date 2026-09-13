"use client";

import { useEffect, useState } from "react";

const CHAT_PANEL_NARROW_QUERY = "(max-width: 1023px)";

function useMediaQueryMatches(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handleChange = () => setMatches(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}

/**
 * The conversation's side panels are `w-80` columns beside a full message list,
 * which only fits from `lg`. Below it they carry no width and were rendered
 * `hidden lg:flex`, so "Open thread" toggled state that painted nothing between
 * 640px and 1024px while the trigger stayed operable. This is the width at which
 * they have to become an overlay instead.
 */
export function useIsChatPanelNarrow(): boolean {
  return useMediaQueryMatches(CHAT_PANEL_NARROW_QUERY);
}
