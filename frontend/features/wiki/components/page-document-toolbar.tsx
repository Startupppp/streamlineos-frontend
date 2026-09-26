"use client";

import { Fragment } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { KbLink2Icon, KbMoreHorizontalIcon } from "@/features/wiki/lib/kb-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  useToggleFavoriteKbPage,
  useDuplicateKbPage,
  useLockKbPage,
  useKbPageBacklinks,
} from "@/hooks/api/kb";
import { useCan } from "@/hooks/api/access";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";
import { KbPageAiActions } from "./kb-page-ai-actions";
import PageSharePopover from "./page-share-popover";
import { exportKbPage } from "@/features/wiki/lib/export-page";
import {
  resolveKbPageActions,
  groupKbPageActions,
  toKbPageActionId,
} from "@/features/wiki/lib/page-action-descriptors";

interface PageDocumentToolbarProps {
  page: KbPageDetail;
  pageId: number;
  isEditable: boolean;
  currentContent?: string;
  onApplyImprovement?: (text: string) => void;
  onInsertSummary?: (text: string) => void;
  onOpenMetaSheet: () => void;
  onOpenComments: () => void;
  onOpenHistory: () => void;
  onOpenMove: () => void;
  onOpenSaveAsTemplate: () => void;
  onOpenCover: () => void;
  onDelete: () => void;
  onNavigate: (pageId: number) => void;
}

export function PageDocumentToolbar({
  page,
  pageId,
  isEditable,
  currentContent,
  onApplyImprovement,
  onInsertSummary,
  onOpenMetaSheet,
  onOpenComments,
  onOpenHistory,
  onOpenMove,
  onOpenSaveAsTemplate,
  onOpenCover,
  onDelete,
  onNavigate,
}: PageDocumentToolbarProps) {
  const canCreate = useCan("kb:pages:create");
  const canUpdate = useCan("kb:pages:update");
  const canManage = useCan("kb:pages:manage");
  const canDelete = useCan("kb:pages:delete");
  const canExport = useCan("kb:pages:export");
  const canManageTemplates = useCan("kb:templates:manage");

  const toggleFavorite = useToggleFavoriteKbPage();
  const duplicatePage = useDuplicateKbPage();
  const lockPage = useLockKbPage();
  const { data: backlinks = [] } = useKbPageBacklinks(pageId);

  const actions = resolveKbPageActions(
    {
      isFavorite: page.isFavorite,
      isLocked: page.isLocked,
      hasCover: page.coverImage !== null,
    },
    {
      canCreate,
      canUpdate,
      canManage,
      canDelete,
      canExport,
      canManageTemplates,
      isEditable,
    },
  );

  const groups = groupKbPageActions(actions);

  function handleToggleFavorite() {
    toggleFavorite.mutate(
      { pageId, isFavorite: page.isFavorite },
      { onError: () => toast.error("Failed to update favorites") },
    );
  }

  function handleDuplicate() {
    duplicatePage.mutate(pageId, {
      onSuccess: (dup) => {
        toast.success("Page duplicated");
        onNavigate(dup.id);
      },
      onError: () => toast.error("Failed to duplicate page"),
    });
  }

  function handleToggleLock() {
    lockPage.mutate(
      { pageId, isLocked: !page.isLocked },
      {
        onSuccess: () =>
          toast.success(page.isLocked ? "Page unlocked" : "Page locked"),
        onError: () => toast.error("Failed to update lock"),
      },
    );
  }

  function handleExport() {
    void exportKbPage(pageId, "html").catch((error: unknown) =>
      toast.error(getErrorMessage(error)),
    );
  }

  function handleBacklinkSelect(event: Event) {
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;
    const id = target.dataset.pageId;
    if (!id) return;
    onNavigate(Number(id));
  }

  function handleMenuSelect(event: Event) {
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;
    const id = toKbPageActionId(target.dataset.actionId);
    if (!id) return;
    switch (id) {
      case "comments": onOpenComments(); break;
      case "history": onOpenHistory(); break;
      case "info": onOpenMetaSheet(); break;
      case "favorite": handleToggleFavorite(); break;
      case "cover": onOpenCover(); break;
      case "duplicate": handleDuplicate(); break;
      case "move": onOpenMove(); break;
      case "lock": handleToggleLock(); break;
      case "saveTemplate": onOpenSaveAsTemplate(); break;
      case "export": handleExport(); break;
      case "delete": onDelete(); break;
      case "backlinks": break;
    }
  }

  return (
    <div className="flex shrink-0 items-center justify-end gap-1.5 self-end sm:self-auto">
      <KbPageAiActions
        pageId={pageId}
        currentContent={currentContent}
        onApplyImprovement={onApplyImprovement}
        onInsertSummary={onInsertSummary}
      />
      {canUpdate && <PageSharePopover page={page} />}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 w-9 px-0"
            aria-label="More options"
          >
            <KbMoreHorizontalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {groups.map((group, groupIndex) => (
            <Fragment key={group[0]?.id ?? groupIndex}>
              {groupIndex > 0 && <DropdownMenuSeparator />}
              {group.map((action) => {
                if (action.id === "backlinks") {
                  return (
                    <DropdownMenuSub key="backlinks">
                      <DropdownMenuSubTrigger>
                        <KbLink2Icon className="mr-2 h-4 w-4" />
                        {action.label}
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-56">
                        {backlinks.length === 0 ? (
                          <div className="px-2 py-1.5 text-xs text-muted-foreground">
                            No pages link here yet.
                          </div>
                        ) : (
                          backlinks.map((bl) => (
                            <DropdownMenuItem
                              key={bl.id}
                              data-page-id={String(bl.id)}
                              onSelect={handleBacklinkSelect}
                            >
                              <span className="mr-2 shrink-0">{bl.icon ?? "📄"}</span>
                              <TruncatedText text={bl.title || "Untitled"} />
                            </DropdownMenuItem>
                          ))
                        )}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  );
                }
                const Icon = action.icon;
                return (
                  <DropdownMenuItem
                    key={action.id}
                    data-action-id={action.id}
                    variant={action.destructive ? "destructive" : undefined}
                    onSelect={handleMenuSelect}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {action.label}
                  </DropdownMenuItem>
                );
              })}
            </Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
