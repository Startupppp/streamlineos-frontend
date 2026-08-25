"use client";

import { useCallback, useEffect, useState } from "react";
import { Rows3, Rows4 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DENSITY_MODES, type DensityMode } from "@/lib/design-tokens";

const STORAGE_KEY = "streamline.density";

function isDensity(value: unknown): value is DensityMode {
  return typeof value === "string" && (DENSITY_MODES as readonly string[]).includes(value);
}

/**
 * The reader's density, remembered.
 *
 * Per person rather than per screen: someone who wants forty rows wants them
 * everywhere, and asking again on each list is the kind of setting people stop
 * using. Reads are wrapped because a private window, cleared site data or a
 * browser configured to block storage all throw on access rather than returning
 * nothing.
 */
export function useDensity(): [DensityMode, (mode: DensityMode) => void] {
  const [density, setDensityState] = useState<DensityMode>("comfortable");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isDensity(stored)) setDensityState(stored);
    } catch {
      // Storage unavailable. Comfortable is the documented default.
    }
  }, []);

  const setDensity = useCallback((mode: DensityMode) => {
    setDensityState(mode);
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // The choice still applies to this page; it just will not be remembered.
    }
  }, []);

  return [density, setDensity];
}

export interface DensityToggleProps {
  density: DensityMode;
  onChange: (mode: DensityMode) => void;
  className?: string;
}

/**
 * One control, used by every generated surface.
 *
 * Density is a property of the engine rather than of a screen — which is the
 * whole point of having an engine. Written once here, it reaches every list
 * without two hundred screens each inventing a toggle.
 */
export function DensityToggle({ density, onChange, className }: DensityToggleProps) {
  const compact = density === "compact";

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      aria-pressed={compact}
      // The button says what pressing it does, not what is currently true.
      aria-label={compact ? "Switch to comfortable rows" : "Switch to compact rows"}
      onClick={() => onChange(compact ? "comfortable" : "compact")}
    >
      {compact ? <Rows3 className="size-4" /> : <Rows4 className="size-4" />}
      <span className="ml-1.5 hidden sm:inline">{compact ? "Comfortable" : "Compact"}</span>
    </Button>
  );
}
