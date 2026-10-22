"use client";

import { useCallback, useEffect, useState } from "react";
import { Rows3, Rows4 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DENSITY_MODES, type DensityMode } from "@/lib/design-tokens";

const STORAGE_KEY = "streamline.density";

function isDensity(value: unknown): value is DensityMode {
  return typeof value === "string" && (DENSITY_MODES as readonly string[]).includes(value);
}

export function useDensity(): [DensityMode, (mode: DensityMode) => void] {
  const [density, setDensityState] = useState<DensityMode>("comfortable");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isDensity(stored)) setDensityState(stored);
    } catch {
    }
  }, []);

  const setDensity = useCallback((mode: DensityMode) => {
    setDensityState(mode);
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
    }
  }, []);

  return [density, setDensity];
}

export interface DensityToggleProps {
  density: DensityMode;
  onChange: (mode: DensityMode) => void;
  className?: string;
}

export function DensityToggle({ density, onChange, className }: DensityToggleProps) {
  const compact = density === "compact";

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      aria-pressed={compact}
      aria-label={compact ? "Switch to comfortable rows" : "Switch to compact rows"}
      onClick={() => onChange(compact ? "comfortable" : "compact")}
    >
      {compact ? <Rows3 className="size-4" /> : <Rows4 className="size-4" />}
      <span className="ml-1.5 hidden sm:inline">{compact ? "Comfortable" : "Compact"}</span>
    </Button>
  );
}
