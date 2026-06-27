"use client";

import { useFeatureFlags } from "@/lib/api/hooks/feature-flags";

export function useFeatureFlag(key: string): boolean {
  const { data: flags } = useFeatureFlags();
  const flag = flags?.find((f) => f.key === key);
  return flag?.enabled === true;
}
