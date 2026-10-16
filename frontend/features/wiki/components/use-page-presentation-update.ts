"use client";

import { useState } from "react";
import { toast } from "sonner";

import { isApiError } from "@/lib/api-envelope";
import { kbPageEditConflictContract } from "@/features/wiki/lib/wiki-schema";
import { useKbPage, useUpdateKbPage } from "@/hooks/api/kb/pages";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";

type PresentationField = "icon" | "coverImage";

interface PendingPresentation {
  pageId: number;
  field: PresentationField;
  value: string | null;
  minimumRevision: number | null;
}

interface UsePagePresentationUpdateArgs {
  pageId: number;
  page: KbPageDetail | undefined;
  canManage: boolean;
  updatePage: ReturnType<typeof useUpdateKbPage>;
  refetch: ReturnType<typeof useKbPage>["refetch"];
}

export function usePagePresentationUpdate({
  pageId,
  page,
  canManage,
  updatePage,
  refetch,
}: UsePagePresentationUpdateArgs) {
  const [pending, setPending] = useState<PendingPresentation | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const active = pending?.pageId === pageId ? pending : null;

  function handleError(field: PresentationField, value: string | null, error: unknown) {
    if (isApiError(error) && error.status === 409) {
      const details = kbPageEditConflictContract.safeParse(error.details);
      setPending({
        pageId,
        field,
        value,
        minimumRevision: details.success ? details.data.currentContentRevision : null,
      });
      toast.error(`Page changed before the ${field === "icon" ? "icon" : "cover"} update was saved`);
      return;
    }
    toast.error(`Failed to update ${field === "icon" ? "icon" : "cover"}`);
  }

  function handleCoverChange(coverImage: string | null) {
    if (!page) return;
    updatePage.mutate(
      { pageId, coverImage, expectedContentRevision: page.contentRevision },
      {
        onSuccess: () => {
          setPending((item) => item?.pageId === pageId && item.field === "coverImage" ? null : item);
          toast.success(coverImage ? "Cover updated" : "Cover removed");
        },
        onError: (error) => handleError("coverImage", coverImage, error),
      },
    );
  }

  function handleIconChange(icon: string | null) {
    if (!page) return;
    updatePage.mutate(
      { pageId, icon, expectedContentRevision: page.contentRevision },
      {
        onSuccess: () => setPending((item) => item?.pageId === pageId && item.field === "icon" ? null : item),
        onError: (error) => handleError("icon", icon, error),
      },
    );
  }

  async function retry() {
    if (!active || isRetrying) return;
    setIsRetrying(true);
    try {
      const latest = await refetch();
      if (
        !latest.isSuccess ||
        !latest.data ||
        latest.data.canEdit !== true ||
        (latest.data.isLocked && !canManage) ||
        (active.minimumRevision !== null && latest.data.contentRevision < active.minimumRevision)
      ) {
        throw new Error("Current page version is unavailable");
      }
      await updatePage.mutateAsync({
        pageId,
        [active.field]: active.value,
        expectedContentRevision: latest.data.contentRevision,
      });
      setPending(null);
      toast.success(`${active.field === "icon" ? "Icon" : "Cover"} updated`);
    } catch (error) {
      if (isApiError(error) && error.status === 409) {
        handleError(active.field, active.value, error);
      } else {
        toast.error("Could not retry the page change. Your choice is still available.");
      }
    } finally {
      setIsRetrying(false);
    }
  }

  return {
    pendingPresentation: active,
    isRetryingPresentation: isRetrying,
    handleCoverChange,
    handleIconChange,
    handleRetryPresentation: retry,
    discardPresentation: () => setPending(null),
  };
}
