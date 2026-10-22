"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

const ErrorAppearanceContext = createContext(false);

export function ErrorAppearanceProvider({
  children,
}: {
  children?: ReactNode;
}) {
  return (
    <ErrorAppearanceContext.Provider value={true}>
      {children}
    </ErrorAppearanceContext.Provider>
  );
}

export function useIllustratedErrors(): boolean {
  return useContext(ErrorAppearanceContext);
}
