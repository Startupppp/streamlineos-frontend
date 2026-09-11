"use client";

import { useState, useEffect } from "react";

export function useAfterLoad(): boolean {
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    if (document.readyState === "complete") {
      setLoaded(true);
      return;
    }
    function handleLoad() {
      setLoaded(true);
    }
    window.addEventListener("load", handleLoad);
    return () => window.removeEventListener("load", handleLoad);
  }, []);

  return loaded;
}
