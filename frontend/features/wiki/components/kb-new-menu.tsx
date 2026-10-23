"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
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

export function KbNewMenu({ scope, allowFolder, onCreated, trigger, baseHref, className }: KbNewMenuProps) {
  const router = useRouter();
  const canCreate = useCan("kb:pages:create");
  const canManageSpaces = useCan("kb:spaces:manage");
  const canImport = useCan("kb:pages:import");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileUploadInputRef = useRef<HTMLInputElement>(null);
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

  function handleUploadFileClick() {
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
    void createPage.submit({ ...scope, kind: "document" });
  }

  function handleSpreadsheet() {
    void createPage.submit({ ...scope, kind: "spreadsheet" });
  }

  function handleUploadClick() {
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
    setFolderSheetOpen(true);
  }

  function handleFolderOpenChange(open: boolean) {
    setFolderSheetOpen(open);
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{triggerEl}</DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={handleDocument}>
            <KbFileTextIcon className="h-4 w-4" />
            Document
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleSpreadsheet}>
            <KbSpreadsheetIcon className="h-4 w-4" />
            Spreadsheet
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleUploadFileClick}>
            <KbFileDownIcon className="h-4 w-4" />
            Upload file
          </DropdownMenuItem>
          {allowFolder && canManageSpaces && (
            <DropdownMenuItem onSelect={handleOpenFolder}>
              <KbFolderOpenIcon className="h-4 w-4" />
              Folder
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleUploadClick}>
            <KbUploadIcon className="h-4 w-4" />
            Upload Excel or CSV
          </DropdownMenuItem>
          {canImport && (
            <DropdownMenuItem asChild>
              <Link href={KB_IMPORT}>
                <KbUploadIcon className="h-4 w-4" />
                Import documents
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href={KB_TEMPLATES}>
              <KbLayoutTemplateIcon className="h-4 w-4" />
              From template
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
