"use client";

import { Fragment, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useDeleteKbPage, useDuplicateKbPage, useToggleFavoriteKbPage } from "@/hooks/api/kb";
import { useExportKbPage } from "@/hooks/api/kb/export-page";
import { useCan } from "@/hooks/api/access";
import type { KbPageCollectionItem } from "@/hooks/api/kb/page-collection";
import { getErrorMessage } from "@/lib/get-error-message";
import { pageHref, pageHistoryHref } from "@/lib/knowledge-routes";
import {
  resolveKbPageActions,
  groupKbPageActions,
  type KbPageActionCapabilities,
  type KbPageActionSubject,
  toKbPageActionId,
} from "@/features/wiki/lib/page-action-descriptors";
import { KbMoreHorizontalIcon } from "@/features/wiki/lib/kb-icons";

interface CollectionItemMenuProps {
  page: KbPageCollectionItem;
  resolveHref?: (id: number) => string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CollectionItemMenu({ page, resolveHref, open, onOpenChange }: CollectionItemMenuProps) {
  const href = resolveHref ?? pageHref;
  const router = useRouter();
  const canCreate = useCan("kb:pages:create");
  const canUpdate = useCan("kb:pages:update");
  const canManage = useCan("kb:pages:manage");
  const canDelete = useCan("kb:pages:delete");
  const canExport = useCan("kb:pages:export");
  const canManageTemplates = useCan("kb:templates:manage");
  const toggleFavorite = useToggleFavoriteKbPage();
  const duplicatePage = useDuplicateKbPage();
  const deletePage = useDeleteKbPage();
  const exportPage = useExportKbPage();
  const exportInFlightRef = useRef(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const capabilities: KbPageActionCapabilities = {
    canCreate,
    canUpdate,
    canManage,
    canDelete,
    canExport,
    canManageTemplates,
    isEditable: canUpdate,
  };

  const subject: KbPageActionSubject = {
    isFavorite: false,
    isLocked: false,
    hasCover: page.coverImage !== null,
  };

  const actions = resolveKbPageActions(subject, capabilities);
  const groups = groupKbPageActions(actions);

  function handleDeleteOpenChange(open: boolean) {
    setDeleteOpen(open);
  }

  function handleDeleteConfirm() {
    deletePage.mutate(page.id, {
      onSuccess: () => toast.success("Page deleted"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
    setDeleteOpen(false);
  }

  function handleCopyLink() {
    const url = new URL(href(page.id), window.location.origin).toString();
    navigator.clipboard.writeText(url).then(
      () => toast.success("Link copied"),
      () => toast.error("Failed to copy"),
    );
  }

  function handleExport() {
    if (!canExport || exportPage.isPending || exportInFlightRef.current) return;
    exportInFlightRef.current = true;
    exportPage.mutate(
      { pageId: page.id, format: "html" },
      {
        onSuccess: () => { exportInFlightRef.current = false; },
        onError: (error) => {
          exportInFlightRef.current = false;
          toast.error(getErrorMessage(error));
        },
      },
    );
  }

  function handleSelect(event: Event) {
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;
    const actionId = toKbPageActionId(target.dataset.actionId);
    if (!actionId) return;
    if (actionId === "favorite") {
      toggleFavorite.mutate(
        { pageId: page.id, isFavorite: false },
        { onError: (err) => toast.error(getErrorMessage(err)) },
      );
    } else if (actionId === "duplicate") {
      duplicatePage.mutate(page.id, {
        onSuccess: (dup) => {
          toast.success("Page duplicated");
          router.push(href(dup.id));
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    } else if (actionId === "delete") {
      setDeleteOpen(true);
    } else if (actionId === "history") {
      router.push(pageHistoryHref(page.id));
    } else if (actionId === "copyLink") {
      handleCopyLink();
    } else if (actionId === "export") {
      handleExport();
    } else {
      router.push(href(page.id));
    }
  }

  return (
    <>
      <ConfirmDialog
        title="Delete page"
        description="This page will be moved to trash and can be restored for 30 days."
        confirmLabel="Delete"
        destructive
        isPending={deletePage.isPending}
        open={deleteOpen}
        onOpenChange={handleDeleteOpenChange}
        onConfirm={handleDeleteConfirm}
      />
      <DropdownMenu open={open} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Page actions">
            <KbMoreHorizontalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {groups.map((group, groupIndex) => (
            <Fragment key={group[0]?.group ?? String(groupIndex)}>
              {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
              {group.map((action) => (
                <DropdownMenuItem
                  key={action.id}
                  data-action-id={action.id}
                  variant={action.destructive ? "destructive" : "default"}
                  disabled={action.id === "export" && exportPage.isPending}
                  onSelect={handleSelect}
                >
                  <action.icon className="h-4 w-4" />
                  {action.id === "comments" || action.id === "info" || action.id === "backlinks" || action.id === "linkedRecords" || action.id === "cover" || action.id === "move" || action.id === "lock" || action.id === "saveTemplate"
                    ? `Open page · ${action.label}`
                    : action.label}
                </DropdownMenuItem>
              ))}
            </Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
