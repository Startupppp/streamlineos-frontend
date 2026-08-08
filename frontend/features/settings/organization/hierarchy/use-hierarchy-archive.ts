"use client";

import { useState } from "react";
import { toast } from "sonner";

type ArchiveTarget = {
  id: string;
  name: string;
};

type ArchiveCallbacks = {
  onSuccess: () => void;
  onError: (error: unknown) => void;
};

interface UseHierarchyArchiveOptions<T extends ArchiveTarget> {
  archive: (target: T, callbacks: ArchiveCallbacks) => void;
  successMessage: string;
  onArchived?: () => void;
}

export function useHierarchyArchive<T extends ArchiveTarget>({
  archive,
  successMessage,
  onArchived,
}: UseHierarchyArchiveOptions<T>) {
  const [target, setTarget] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);

  function requestArchive(nextTarget: T) {
    setError(null);
    setTarget(nextTarget);
  }

  function confirmArchive() {
    if (!target) return;
    setError(null);
    archive(target, {
      onSuccess: () => {
        toast.success(successMessage);
        setTarget(null);
        setError(null);
        onArchived?.();
      },
      onError: (archiveError) => {
        setError(archiveError);
      },
    });
  }

  function handleOpenChange(open: boolean) {
    if (open) return;
    setTarget(null);
    setError(null);
  }

  return {
    target,
    error,
    requestArchive,
    confirmArchive,
    handleOpenChange,
  };
}
