"use client";

import { useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { useHydrated } from "@/hooks/common/use-hydrated";

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean): void {
  try {
    if (value) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
  } catch {}
}

export function useDismissal(name: string): [boolean, (value: boolean) => void] {
  const { data: session } = useSession();
  const hydrated = useHydrated();
  const key = session?.orgId ? `payroll-${name}:${session.orgId}` : null;
  const [override, setOverride] = useState<boolean | null>(null);
  const dismissed = override ?? (hydrated && key ? readFlag(key) : false);

  const setDismissed = useCallback(
    (value: boolean) => {
      setOverride(value);
      if (key) writeFlag(key, value);
    },
    [key],
  );

  return [dismissed, setDismissed];
}
