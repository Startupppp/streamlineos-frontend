"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

interface AskOsContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const AskOsContext = createContext<AskOsContextValue | null>(null);

export function useAskOs(): AskOsContextValue {
  const ctx = useContext(AskOsContext);
  if (!ctx) {
    throw new Error("useAskOs must be used inside AskOsProvider");
  }
  return ctx;
}

export function useAskOsState(): AskOsContextValue {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  return useMemo(() => ({ open, setOpen, toggle }), [open, toggle]);
}
