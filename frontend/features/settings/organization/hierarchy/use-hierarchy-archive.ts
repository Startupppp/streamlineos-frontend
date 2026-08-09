"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { getOrgUnitDependencyPreview } from "@/hooks/api/org-hierarchy";
import type {
  OrgUnitDependency,
  OrgUnitDependencyPreview,
  OrgUnitKind,
} from "@/types/org-hierarchy";

type ArchiveTarget = {
  id: string;
  name: string;
};

type ArchiveCallbacks = {
  onSuccess: () => void;
  onError: (error: unknown) => void;
};

interface UseHierarchyArchiveOptions<T extends ArchiveTarget> {
  unitKind: OrgUnitKind;
  archive: (target: T, callbacks: ArchiveCallbacks) => void;
  successMessage: string;
  onArchived?: () => void;
  loadDependencies?: (target: T) => Promise<OrgUnitDependencyPreview>;
}

export function useHierarchyArchive<T extends ArchiveTarget>({
  unitKind,
  archive,
  successMessage,
  onArchived,
  loadDependencies,
}: UseHierarchyArchiveOptions<T>) {
  const [target, setTarget] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [preflightError, setPreflightError] = useState<unknown>(null);
  const [dependencies, setDependencies] = useState<OrgUnitDependency[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const requestVersion = useRef(0);

  const runPreflight = useCallback(
    async (nextTarget: T) => {
      const version = ++requestVersion.current;
      setIsChecking(true);
      setPreflightError(null);
      setDependencies([]);

      try {
        const preview = await (loadDependencies
          ? loadDependencies(nextTarget)
          : getOrgUnitDependencyPreview(unitKind, nextTarget.id));
        if (requestVersion.current !== version) return;
        setDependencies(preview.dependencies);
      } catch (nextError) {
        if (requestVersion.current !== version) return;
        setPreflightError(nextError);
      } finally {
        if (requestVersion.current === version) setIsChecking(false);
      }
    },
    [loadDependencies, unitKind],
  );

  function requestArchive(nextTarget: T) {
    setError(null);
    setTarget(nextTarget);
    void runPreflight(nextTarget);
  }

  function retryPreflight() {
    if (!target) return;
    void runPreflight(target);
  }

  function confirmArchive() {
    if (!target || isChecking || preflightError || dependencies.length > 0) {
      return;
    }
    setError(null);
    archive(target, {
      onSuccess: () => {
        toast.success(successMessage);
        setTarget(null);
        setError(null);
        setPreflightError(null);
        setDependencies([]);
        onArchived?.();
      },
      onError: (archiveError) => {
        setError(archiveError);
      },
    });
  }

  function handleOpenChange(open: boolean) {
    if (open) return;
    requestVersion.current += 1;
    setTarget(null);
    setError(null);
    setPreflightError(null);
    setDependencies([]);
    setIsChecking(false);
  }

  return {
    target,
    error,
    preflightError,
    dependencies,
    isChecking,
    requestArchive,
    retryPreflight,
    confirmArchive,
    handleOpenChange,
  };
}
