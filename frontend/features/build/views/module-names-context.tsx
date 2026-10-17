"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

const ModuleNamesContext = createContext<ReadonlyMap<number, string>>(new Map());

interface ModuleNamesProviderProps {
  modules: readonly { id: number; name: string }[] | undefined;
  children: ReactNode;
}

export function ModuleNamesProvider({ modules, children }: ModuleNamesProviderProps) {
  const value = useMemo(
    () => new Map((modules ?? []).map((m) => [m.id, m.name])),
    [modules],
  );
  return (
    <ModuleNamesContext.Provider value={value}>{children}</ModuleNamesContext.Provider>
  );
}

export function useModuleName(moduleId: number | null | undefined): string | null {
  const names = useContext(ModuleNamesContext);
  if (moduleId == null) return null;
  return names.get(moduleId) ?? null;
}
