"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  KB_IMPORT,
  KB_TEMPLATES,
  pageHref,
  projectPageHref,
} from "@/lib/knowledge-routes";
import { useGuardedCreateKbPage } from "@/features/wiki/hooks/use-guarded-create-kb-page";
import {
  KB_SPREADSHEET_ACCEPT,
  readSpreadsheetFile,
} from "@/features/wiki/lib/kb-spreadsheet-file";
import {
  KbFileTextIcon,
  KbFileDownIcon,
  KbFolderOpenIcon,
  KbLayoutTemplateIcon,
  KbPlusIcon,
  KbSpreadsheetIcon,
  KbUploadIcon,
} from "@/features/wiki/lib/kb-icons";
import { SpaceSheet } from "./space-sheet";
import { useUploadKbFile } from "@/hooks/api/kb/files";
import type { KbPage } from "@/hooks/api/kb/page-types";

export interface KbNewMenuScope {
  spaceId?: number | null;
  projectId?: number | null;
  parentPageId?: number | null;
}

interface KbNewMenuProps {
  scope: KbNewMenuScope;
  allowFolder: boolean;
  onCreated?: (page: KbPage) => void;
  trigger?: React.ReactNode;
  baseHref?: string;
  className?: string;
}

const MENU_ITEM_CLASS =
  "relative flex w-full cursor-default items-center gap-2 rounded-md px-2 py-2.5 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none md:py-1.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground";

export function KbNewMenu({ scope, allowFolder, onCreated, trigger, baseHref, className }: KbNewMenuProps) {
  const router = useRouter();
  const canCreate = useCan("kb:pages:create");
  const canManageSpaces = useCan("kb:spaces:manage");
  const canImport = useCan("kb:pages:import");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileUploadInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [folderSheetOpen, setFolderSheetOpen] = useState(false);
  const uploadFile = useUploadKbFile();

  const createPage = useGuardedCreateKbPage((page) => {
    const href = baseHref
      ? `${baseHref}/${page.id}`
      : scope.projectId != null
        ? projectPageHref(scope.projectId, page.id)
        : pageHref(page.id);
    router.push(href);
    onCreated?.(page);
  });

  if (!canCreate) return null;

  function closeMenu() {
    setOpen(false);
  }

  function handleUploadFileClick() {
    closeMenu();
    fileUploadInputRef.current?.click();
  }

  function handleUploadFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    uploadFile.mutate(
      { file, ...scope },
      {
        onError: (err: unknown) => toast.error(getErrorMessage(err)),
        onSuccess: (data) => {
          toast.success(`${file.name} uploaded.`);
          const href = baseHref
            ? `${baseHref}/${data.page.id}`
            : scope.projectId != null
              ? projectPageHref(scope.projectId, data.page.id)
              : pageHref(data.page.id);
          router.push(href);
        },
      },
    );
  }

  function handleDocument() {
    closeMenu();
    void createPage.submit({ ...scope, kind: "document" });
  }

  function handleSpreadsheet() {
    closeMenu();
    void createPage.submit({ ...scope, kind: "spreadsheet" });
  }

  function handleUploadClick() {
    closeMenu();
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    readSpreadsheetFile(file).then(
      ({ title, workbook }) => {
        void createPage.submit({ ...scope, kind: "spreadsheet", title, workbook });
      },
      (err: unknown) => {
        toast.error(getErrorMessage(err));
      },
    );
  }

  function handleOpenFolder() {
    closeMenu();
    setFolderSheetOpen(true);
  }

  function handleFolderOpenChange(next: boolean) {
    setFolderSheetOpen(next);
  }

  function handleFolderSuccess() {
    setFolderSheetOpen(false);
  }

  const isPending = createPage.isSubmitting || uploadFile.isPending;
  const triggerEl = trigger ?? (
    <LoadingButton
      size="sm"
      className={cn("min-w-0 gap-1", className)}
      isPending={isPending}
      loadingText="Creating…"
    >
      <KbPlusIcon className="h-4 w-4" />
      New
    </LoadingButton>
  );

  return (
    <>
      <ResponsivePopover open={open} onOpenChange={setOpen}>
        <ResponsivePopoverTrigger asChild>{triggerEl}</ResponsivePopoverTrigger>
        <ResponsivePopoverContent
          align="end"
          title="New"
          showHeader
          className="w-[min(18rem,calc(100vw-2rem))] p-1 md:min-w-[10rem] md:w-auto"
        >
          <div role="menu" aria-label="New" className="flex flex-col gap-0.5">
            <button type="button" role="menuitem" className={MENU_ITEM_CLASS} onClick={handleDocument}>
              <KbFileTextIcon className="h-4 w-4" />
              Document
            </button>
            <button type="button" role="menuitem" className={MENU_ITEM_CLASS} onClick={handleSpreadsheet}>
              <KbSpreadsheetIcon className="h-4 w-4" />
              Spreadsheet
            </button>
            <button type="button" role="menuitem" className={MENU_ITEM_CLASS} onClick={handleUploadFileClick}>
              <KbFileDownIcon className="h-4 w-4" />
              Upload file
            </button>
            {allowFolder && canManageSpaces ? (
              <button type="button" role="menuitem" className={MENU_ITEM_CLASS} onClick={handleOpenFolder}>
                <KbFolderOpenIcon className="h-4 w-4" />
                Folder
              </button>
            ) : null}
            <div role="separator" className="my-1 h-px bg-border" />
            <button type="button" role="menuitem" className={MENU_ITEM_CLASS} onClick={handleUploadClick}>
              <KbUploadIcon className="h-4 w-4" />
              Upload Excel or CSV
            </button>
            {canImport ? (
              <Link
                href={KB_IMPORT}
                role="menuitem"
                className={MENU_ITEM_CLASS}
                onClick={closeMenu}
              >
                <KbUploadIcon className="h-4 w-4" />
                Import documents
              </Link>
            ) : null}
            <Link
              href={KB_TEMPLATES}
              role="menuitem"
              className={MENU_ITEM_CLASS}
              onClick={closeMenu}
            >
              <KbLayoutTemplateIcon className="h-4 w-4" />
              From template
            </Link>
          </div>
        </ResponsivePopoverContent>
      </ResponsivePopover>
      <input
        ref={fileInputRef}
        type="file"
        accept={KB_SPREADSHEET_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        onChange={handleFileChange}
        aria-hidden="true"
      />
      <input
        ref={fileUploadInputRef}
        type="file"
        className="sr-only"
        tabIndex={-1}
        onChange={handleUploadFileChange}
        aria-hidden="true"
      />
      {allowFolder && canManageSpaces && (
        <SpaceSheet
          open={folderSheetOpen}
          editingSpace={null}
          onOpenChange={handleFolderOpenChange}
          onSuccess={handleFolderSuccess}
        />
      )}
    </>
  );
}
