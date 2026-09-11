"use client";

import { createContext, useContext } from "react";
import type { ShellVariant } from "@/lib/shell-variant";

const ShellVariantContext = createContext<ShellVariant>("desktop");

interface ShellVariantProviderProps {
  variant: ShellVariant;
  children: React.ReactNode;
}

export function ShellVariantProvider({
  variant,
  children,
}: ShellVariantProviderProps) {
  return (
    <ShellVariantContext.Provider value={variant}>
      {children}
    </ShellVariantContext.Provider>
  );
}

export function useShellVariant(): ShellVariant {
  return useContext(ShellVariantContext);
}
