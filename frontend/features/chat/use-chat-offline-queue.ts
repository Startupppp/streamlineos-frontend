"use client";

import { useEffect, useState, type RefObject } from "react";

export function useChatOfflineQueue(
  flushRef: RefObject<() => Promise<void>>,
): { isOnline: boolean } {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      void flushRef.current();
    };
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [flushRef]);

  return { isOnline };
}
