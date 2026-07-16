"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { AskOsContext, useAskOsState } from "./ask-os-context";

const GlobalAskOs = dynamic(
  () => import("./global-ask-os").then((m) => ({ default: m.GlobalAskOs })),
  { ssr: false },
);

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
