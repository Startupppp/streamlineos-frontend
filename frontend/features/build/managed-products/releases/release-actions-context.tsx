"use client";

import { createContext, useContext } from "react";
import type { ManagedProductRelease } from "@/hooks/api/build/managed-product-releases";

export interface ReleaseActions {
  canUpdate: boolean;
  pendingReleaseId: number | null;
  onCreate: () => void;
  onEdit: (release: ManagedProductRelease) => void;
  onMarkReleased: (release: ManagedProductRelease) => void;
  onArchive: (release: ManagedProductRelease) => void;
  onRestore: (release: ManagedProductRelease) => void;
  onViewDetails: (release: ManagedProductRelease) => void;
}

const ReleaseActionsContext = createContext<ReleaseActions | null>(null);

export const ReleaseActionsProvider = ReleaseActionsContext.Provider;

export function useReleaseActions(): ReleaseActions {
  const actions = useContext(ReleaseActionsContext);
  if (!actions) throw new Error("useReleaseActions must be used inside ReleaseActionsProvider");
  return actions;
}
