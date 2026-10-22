"use client";

import { useStoredFlag } from "./use-stored-flag";

export function useHrSettingsMode(): [boolean, (next: boolean) => void] {
  return useStoredFlag("hr-settings-mode");
}
