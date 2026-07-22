"use client";

import { useCallback, useState } from "react";

export interface CustomerDisplayPrefs {
  showRequests: boolean;
  showAnnualRevenue: boolean;
  showSize: boolean;
  showOwner: boolean;
  showStatus: boolean;
  showTier: boolean;
  showDomains: boolean;
  showDataSource: boolean;
}

const STORAGE_KEY = "pm:customers-display-prefs";

const DEFAULTS: CustomerDisplayPrefs = {
  showRequests: true,
  showAnnualRevenue: false,
  showSize: true,
  showOwner: false,
  showStatus: true,
  showTier: false,
  showDomains: false,
  showDataSource: false,
};

function readPrefs(): CustomerDisplayPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<CustomerDisplayPrefs>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

export function useCustomerDisplayPrefs() {
  const [prefs, setPrefsState] = useState<CustomerDisplayPrefs>(() => readPrefs());

  const setPrefs = useCallback((next: Partial<CustomerDisplayPrefs>) => {
    setPrefsState((prev) => {
      const updated = { ...prev, ...next };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
      }
      return updated;
    });
  }, []);

  const toggle = useCallback((key: keyof CustomerDisplayPrefs) => {
    setPrefsState((prev) => {
      const val = prev[key];
      if (typeof val !== "boolean") return prev;
      const updated = { ...prev, [key]: !val };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
      }
      return updated;
    });
  }, []);

  return { prefs, setPrefs, toggle };
}
