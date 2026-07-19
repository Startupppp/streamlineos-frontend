"use client";

import { useEffect, useState } from "react";

const CHAT_MOBILE_QUERY = "(max-width: 639px)";

export function useIsChatMobile(): boolean {
  const [isChatMobile, setIsChatMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(CHAT_MOBILE_QUERY);
    const handleChange = () => setIsChatMobile(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isChatMobile;
}
