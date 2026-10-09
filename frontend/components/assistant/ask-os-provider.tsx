"use client";

import { useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { AskOsContext, useAskOsState } from "./ask-os-context";
import { AskOsLoading } from "./ask-os-loading";
import { useCompanionPresence } from "./companion-launcher";

const GlobalAskOs = dynamic(
  () => import("./global-ask-os").then((m) => ({ default: m.GlobalAskOs })),
  { ssr: false, loading: AskOsLoading },
);

interface AskOsProviderProps {
  children: ReactNode;
}

export function AskOsProvider({ children }: AskOsProviderProps) {
  const state = useAskOsState();
  const companion = useCompanionPresence();
  const [activated, setActivated] = useState(false);
  const shouldActivate = state.open || companion !== null;
  useEffect(() => {
    if (!shouldActivate || activated) return;
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setActivated(true); });
    return () => { cancelled = true; };
  }, [activated, shouldActivate]);

  return (
    <AskOsContext.Provider value={state}>
      {children}
      {shouldActivate || activated ? <GlobalAskOs /> : <AskOsLoading />}
    </AskOsContext.Provider>
  );
}
