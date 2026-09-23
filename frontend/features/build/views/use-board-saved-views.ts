"use client";

import { useCallback, useState, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useCreateView, useUpdateView } from "@/hooks/api/build";
import { getErrorMessage } from "@/lib/get-error-message";
import { currentSearchParams } from "@/lib/current-search-params";
import type { DisplayOptions } from "@/features/build/shared/types";
import { type SaveViewMeta } from "./save-view-dialog";
import { toSavedViewLayout } from "@/lib/build/view-types";
import type { ViewType } from "./view-switcher";

interface BoardSavedViewsInput {
  projectId: number;
  view: ViewType;
  activeView: { id: number } | null | undefined;
  filters: Record<string, string>;
  displayOptions: DisplayOptions;
}

export function useBoardSavedViews({
  projectId,
  view,
  activeView,
  filters,
  displayOptions,
}: BoardSavedViewsInput) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createView = useCreateView();
  const updateView = useUpdateView();
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [saveViewName, setSaveViewName] = useState("");

  const layoutType = toSavedViewLayout(view);

  const handleSaveView = useCallback(
    (meta?: SaveViewMeta) => {
      const name = saveViewName.trim();
      if (!name) return;
      createView.mutate(
        {
          projectId,
          name,
          filters,
          layoutType,
          ...(meta
            ? { visibility: meta.visibility, displayOptions: meta.displayOptions }
            : {}),
        },
        {
          onSuccess: (created) => {
            toast.success("View saved");
            setSaveViewOpen(false);
            setSaveViewName("");
            if (
              created &&
              typeof created === "object" &&
              "id" in created &&
              typeof created.id === "number"
            ) {
              const next = currentSearchParams(searchParams);
              next.set("viewId", String(created.id));
              router.replace(`?${next.toString()}`, { scroll: false });
            }
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [
      saveViewName,
      filters,
      layoutType,
      projectId,
      createView,
      searchParams,
      router,
    ],
  );

  const handleUpdateActiveView = useCallback(() => {
    if (!activeView) return;
    updateView.mutate(
      {
        viewId: activeView.id,
        projectId,
        filters,
        layoutType,
        groupBy: displayOptions.groupBy,
        orderBy: displayOptions.orderBy,
        displayOptions: { ...displayOptions },
      },
      {
        onSuccess: () => toast.success("View updated"),
        onError: (err: unknown) => toast.error(getErrorMessage(err)),
      },
    );
  }, [activeView, updateView, projectId, filters, layoutType, displayOptions]);

  const handleSaveViewNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setSaveViewName(e.target.value),
    [],
  );

  const handleOpenSaveView = useCallback(() => {
    setSaveViewName("");
    setSaveViewOpen(true);
  }, []);

  return {
    createView,
    updateView,
    saveViewOpen,
    setSaveViewOpen,
    saveViewName,
    handleSaveView,
    handleUpdateActiveView,
    handleSaveViewNameChange,
    handleOpenSaveView,
  };
}
