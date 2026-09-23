"use client";

import { createContext, useContext } from "react";

interface ShellSidebarCollapseValue {
  isCollapsed: boolean;
  onToggle: () => void;
}

const ShellSidebarCollapseContext =
  createContext<ShellSidebarCollapseValue | null>(null);

export function ShellSidebarCollapseProvider({
  isCollapsed,
  onToggle,
  children,
}: ShellSidebarCollapseValue & { children: React.ReactNode }) {
  return (
    <ShellSidebarCollapseContext.Provider value={{ isCollapsed, onToggle }}>
      {children}
    </ShellSidebarCollapseContext.Provider>
  );
}

export function useShellSidebarCollapse(): ShellSidebarCollapseValue {
  const value = useContext(ShellSidebarCollapseContext);
  if (!value) {
    throw new Error(
      "useShellSidebarCollapse must be used within ShellSidebarCollapseProvider",
    );
  }
  return value;
}
