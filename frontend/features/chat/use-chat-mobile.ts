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

export function useIsChatPanelNarrow(): boolean {
  return useMediaQueryMatches(CHAT_PANEL_NARROW_QUERY);
}
