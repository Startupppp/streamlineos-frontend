"use client";

import { useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { AskOsContext, useAskOsState } from "./ask-os-context";
import { AskOsLoading } from "./ask-os-loading";

const GlobalAskOs = dynamic(
  () => import("./global-ask-os").then((m) => ({ default: m.GlobalAskOs })),
  { ssr: false, loading: AskOsLoading },
);

interface AskOsProviderProps {
  children: ReactNode;
}

export function AskOsProvider({ children }: AskOsProviderProps) {
  const state = useAskOsState();
  const [activated, setActivated] = useState(false);
  useEffect(() => {
    if (state.open) setActivated(true);
  }, [state.open]);

  return (
    <AskOsContext.Provider value={state}>
      {children}
      {state.open || activated ? <GlobalAskOs /> : <AskOsLoading />}
    </AskOsContext.Provider>
  );
}
