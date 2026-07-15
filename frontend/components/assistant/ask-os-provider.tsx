"use client";

import type { ReactNode } from "react";
import { GlobalAskOs } from "./global-ask-os";
import { AskOsContext, useAskOsState } from "./ask-os-context";

interface AskOsProviderProps {
  children: ReactNode;
}

export function AskOsProvider({ children }: AskOsProviderProps) {
  const state = useAskOsState();

  return (
    <AskOsContext.Provider value={state}>
      {children}
      <GlobalAskOs />
    </AskOsContext.Provider>
  );
}
