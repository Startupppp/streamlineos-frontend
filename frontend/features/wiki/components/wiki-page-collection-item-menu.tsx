"use client";

import { Fragment, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UserCombobox } from "@/components/ui/user-combobox";
import {
  useDeleteKbPage,
  useDuplicateKbPage,
  useToggleFavoriteKbPage,
  useArchiveKbPage,
  useUnarchiveKbPage,
  useUpdateKbPage,
} from "@/hooks/api/kb/pages";
import { useExportKbPage } from "@/hooks/api/kb/export-page";
import { useCreateKbShortcut } from "@/hooks/api/kb/shortcuts";
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
import { KbMoreHorizontalIcon, KbPencilIcon } from "@/features/wiki/lib/kb-icons";

const PageGrantsSheet = dynamic(() => import("./page-grants-sheet"));

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
  const archivePage = useArchiveKbPage();
  const unarchivePage = useUnarchiveKbPage();
  const updatePage = useUpdateKbPage();
  const createShortcut = useCreateKbShortcut();
  const exportInFlightRef = useRef(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [grantsOpen, setGrantsOpen] = useState(false);
  const [ownerTransferOpen, setOwnerTransferOpen] = useState(false);
  const [pendingOwner, setPendingOwner] = useState("");

  const pageManageable = canManage && page.can.manage;
  const capabilities: KbPageActionCapabilities = {
    canCreate,
    canUpdate: canUpdate && page.can.edit,
    canManage: pageManageable,
    canDelete: canDelete && page.can.manage,
    canExport,
    canManageTemplates,
    isEditable: canUpdate && page.can.edit && (!page.isLocked || page.can.manage),
  };

  const subject: KbPageActionSubject = {
    isFavorite: false,
    isLocked: page.isLocked,
    hasCover: page.coverImage !== null,
    isArchived: page.status === "archived",
  };

  const actions = resolveKbPageActions(subject, capabilities, { collection: true });
  const groups = groupKbPageActions(actions);

  function handleDeleteOpenChange(nextOpen: boolean) {
    setDeleteOpen(nextOpen);
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

  function handleArchive() {
    if (page.status === "archived") {
      unarchivePage.mutate(
        { pageId: page.id, expectedContentRevision: page.contentRevision },
        {
          onSuccess: () => toast.success("Page unarchived"),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    } else {
      archivePage.mutate(
        { pageId: page.id, expectedContentRevision: page.contentRevision },
        {
          onSuccess: () => toast.success("Page archived"),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    }
  }

  function handleOwnerTransferOpen() {
    setPendingOwner(page.ownerUserId ?? "");
    setOwnerTransferOpen(true);
  }

  function handleOwnerTransferChange(value: string) {
    setPendingOwner(value);
  }

  function handleOwnerTransferSave() {
    updatePage.mutate(
      { pageId: page.id, ownerUserId: pendingOwner || null, expectedContentRevision: page.contentRevision },
      {
        onSuccess: () => {
          toast.success("Ownership transferred");
          setOwnerTransferOpen(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleOwnerTransferDialogChange(nextOpen: boolean) {
    setOwnerTransferOpen(nextOpen);
  }

  function handleSelect(event: Event) {
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;
    const actionId = toKbPageActionId(target.dataset.actionId);
    if (!actionId) return;
    if (actionId === "addShortcut") {
      createShortcut.mutate(page.id, {
        onSuccess: () => toast.success("Added to My files"),
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    } else if (actionId === "share") {
      setGrantsOpen(true);
    } else if (actionId === "archive") {
      handleArchive();
    } else if (actionId === "favorite") {
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
      <PageGrantsSheet
        pageId={page.id}
        open={grantsOpen}
        onOpenChange={setGrantsOpen}
      />
      <Dialog open={ownerTransferOpen} onOpenChange={handleOwnerTransferDialogChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Transfer ownership</DialogTitle>
            <DialogDescription>Choose a new owner for this file.</DialogDescription>
          </DialogHeader>
          <UserCombobox
            id="kb-collection-transfer-owner"
            value={pendingOwner}
            onChange={handleOwnerTransferChange}
            placeholder="Select new owner…"
            allowUnassigned={false}
          />
          <DialogFooter>
            <LoadingButton isPending={updatePage.isPending} onClick={handleOwnerTransferSave}>
              Transfer
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
          {canManage && page.can.edit && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleOwnerTransferOpen}>
                <KbPencilIcon className="h-4 w-4" />
                Transfer ownership
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
