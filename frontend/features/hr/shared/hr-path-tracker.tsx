"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useHr } from "./hr-context";

/** Tracks last HR path in the store for back-nav / restore UX. */
export function HrPathTracker() {
  const pathname = usePathname();
  const { setLastPath } = useHr();

  useEffect(() => {
    if (pathname?.startsWith("/hr")) {
      setLastPath(pathname);
    }
  }, [pathname, setLastPath]);

  return null;
}
