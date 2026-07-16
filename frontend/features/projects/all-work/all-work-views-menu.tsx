"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Pin, PinOff, Users, Lock } from "lucide-react";
import {
  BookmarkIcon,
  BookmarkCheckIcon,
  ChevronDownIcon,
  Trash2Icon,
} from "@animateicons/react/lucide";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  SaveViewDialog,
  type SaveViewMeta,
} from "@/features/projects/views/save-view-dialog";
import {
  useWorkspaceViews,
  useCreateWorkspaceView,
  useUpdateWorkspaceView,
  useDeleteWorkspaceView,
} from "@/hooks/api/projects/advanced";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import type { ProjectView } from "@/types/projects";
import type { AllWorkView } from "./all-work-view-switcher";

const FILTER_KEYS = [
  "q",
  "status",
  "priority",
  "type",
  "assigneeId",
  "labels",
  "projectIds",
  "dueDateFrom",
  "dueDateTo",
] as const;

function buildCurrentFilters(
  searchParams: ReturnType<typeof useSearchParams>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of FILTER_KEYS) {
    const val = searchParams.get(key);
    if (val) result[key] = val;
  }
  const scope = searchParams.get("scope");
  if (scope) result["scope"] = scope;
  return result;
}

function applyViewToParams(
  view: ProjectView,
  searchParams: ReturnType<typeof useSearchParams>,
  pathname: string,
  router: ReturnType<typeof useRouter>,
  startTransition: (fn: () => void) => void,
) {
  startTransition(() => {
    const next = new URLSearchParams(searchParams.toString());

    for (const key of FILTER_KEYS) {
      next.delete(key);
    }
    next.delete("scope");
    next.delete("page");

    if (view.filters && typeof view.filters === "object") {
      for (const [k, val] of Object.entries(view.filters)) {
        if (typeof val === "string" && val) next.set(k, val);
      }
    }

    const lt = view.layoutType;
    if (lt === "list" || lt === "table" || lt === "board") {
      next.set("view", lt);
    }

    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  });
}

interface ViewRowProps {
  view: ProjectView;
  currentUserId: string | undefined;
  onApply: (view: ProjectView) => void;
  onTogglePin: (view: ProjectView) => void;
  onDelete: (view: ProjectView) => void;
}

function ViewRow({
  view,
  currentUserId,
  onApply,
  onTogglePin,
  onDelete,
}: ViewRowProps) {
  const { iconRef: deleteIconRef, hoverHandlers: deleteHoverHandlers } =
    useAnimatedIcon();
  const isOwner =
    !view.createdBy || !currentUserId || view.createdBy === currentUserId;
  const isShared = view.visibility === "shared";

  function handleApply(e: React.MouseEvent) {
    e.stopPropagation();
    onApply(view);
  }

  function handleTogglePin(e: React.MouseEvent) {
    e.stopPropagation();
    onTogglePin(view);
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    onDelete(view);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleApply}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onApply(view);
        }
      }}
      className="group flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:bg-accent transition-colors"
    >
      <span className="flex-1 truncate font-medium">{view.name}</span>

      <span
        className="shrink-0 text-muted-foreground group-hover:text-accent-foreground"
        title={isShared ? "Shared" : "Personal"}
      >
        {isShared ? (
          <Users className="h-3 w-3" />
        ) : (
          <Lock className="h-3 w-3" />
        )}
      </span>

      {isOwner && (
        <>
          <button
            type="button"
            onClick={handleTogglePin}
            title={view.isPinned ? "Unpin" : "Pin"}
            className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground transition-opacity"
          >
            {view.isPinned ? (
              <PinOff className="h-3 w-3" />
            ) : (
              <Pin className="h-3 w-3" />
            )}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            title="Delete view"
            className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
            {...deleteHoverHandlers}
          >
            <Trash2Icon ref={deleteIconRef} size={12} />
          </button>
        </>
      )}
    </div>
  );
}

interface AllWorkViewsMenuProps {
  activeView: AllWorkView;
  hasActiveFilters: boolean;
}

export function AllWorkViewsMenu({
  activeView,
  hasActiveFilters,
}: AllWorkViewsMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [, startTransition] = useTransition();

  const [open, setOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  const { iconRef: saveInlineIconRef, hoverHandlers: saveInlineHoverHandlers } =
    useAnimatedIcon();

  const { data: views, isLoading, isError } = useWorkspaceViews();
  const createView = useCreateWorkspaceView();
  const updateView = useUpdateWorkspaceView();
  const deleteView = useDeleteWorkspaceView();

  const currentUserId = session?.user?.id as string | undefined;

  const handleApply = useCallback(
    (view: ProjectView) => {
      applyViewToParams(view, searchParams, pathname, router, startTransition);
      setOpen(false);
    },
    [searchParams, pathname, router],
  );

  const handleTogglePin = useCallback(
    (view: ProjectView) => {
      updateView.mutate(
        { id: view.id, isPinned: !view.isPinned },
        { onError: (err) => toast.error(getErrorMessage(err)) },
      );
    },
    [updateView],
  );

  const handleDelete = useCallback(
    (view: ProjectView) => {
      deleteView.mutate(
        { id: view.id },
        {
          onSuccess: () => toast.success("View deleted"),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [deleteView],
  );

  const handleOpenSave = useCallback(() => {
    setSaveName("");
    setSaveOpen(true);
    setOpen(false);
  }, []);

  const handleSaveNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSaveName(e.target.value);
    },
    [],
  );

  const handleSaveView = useCallback(
    (meta?: SaveViewMeta) => {
      const name = saveName.trim();
      if (!name) return;
      const filters = buildCurrentFilters(searchParams);
      createView.mutate(
        {
          name,
          filters,
          layoutType: activeView,
          ...(meta ? { visibility: meta.visibility } : {}),
        },
        {
          onSuccess: () => {
            toast.success("View saved");
            setSaveOpen(false);
            setSaveName("");
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [saveName, searchParams, activeView, createView],
  );

  const viewList = views ?? [];
  const hasViews = viewList.length > 0;

  return (
    <>
      <div className="flex items-center gap-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <AnimatedIconButton
              variant="outline"
              className="shrink-0 gap-1 px-2.5 text-xs font-normal"
              icon={BookmarkCheckIcon}
              iconSize={14}
            >
              <span>Views</span>
              <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
            </AnimatedIconButton>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-1">
            {isLoading && (
              <div className="space-y-1 p-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full rounded" />
                ))}
              </div>
            )}
            {isError && (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                Failed to load views.
              </p>
            )}
            {!isLoading && !isError && !hasViews && (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                No saved views yet.
              </p>
            )}
            {!isLoading && !isError && hasViews && (
              <div className="space-y-0.5">
                {viewList.map((v) => (
                  <ViewRow
                    key={v.id}
                    view={v}
                    currentUserId={currentUserId}
                    onApply={handleApply}
                    onTogglePin={handleTogglePin}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
            {hasActiveFilters && (
              <>
                <div
                  className={cn("border-t border-border", hasViews && "mt-1")}
                />
                <button
                  type="button"
                  onClick={handleOpenSave}
                  className="mt-1 flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  {...saveInlineHoverHandlers}
                >
                  <BookmarkIcon
                    ref={saveInlineIconRef}
                    size={14}
                    className="shrink-0"
                  />
                  Save current view...
                </button>
              </>
            )}
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <AnimatedIconButton
            type="button"
            variant="outline"
            size="icon"
            onClick={handleOpenSave}
            title="Save current filters as a view"
            aria-label="Save current filters as a view"
            className="shrink-0"
            icon={BookmarkIcon}
            iconSize={14}
          />
        )}
      </div>

      <SaveViewDialog
        open={saveOpen}
        onOpenChange={setSaveOpen}
        viewName={saveName}
        onViewNameChange={handleSaveNameChange}
        onSave={handleSaveView}
        onSaveWithMeta={handleSaveView}
        isSaving={createView.isPending}
        activeLayout={activeView}
      />
    </>
  );
}
