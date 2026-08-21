"use client";

import { forwardRef, useState } from "react";
import {
  Download,
  Eye,
  FileSignature,
  History,
  Pencil,
  Trash2,
} from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  downloadProtectedFile,
  viewProtectedFile,
} from "@/hooks/common/use-file-url";
import { toast } from "sonner";
import { useCan } from "@/hooks/api/access";
import type { Document } from "@/types/hr";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface DocumentRowActionsProps {
  doc: Document;
  onDelete: (documentId: number) => Promise<void>;
  onEdit: (doc: Document) => void;
  onSendForSignature: (doc: Document) => void;
}

export const DocumentRowActions = forwardRef<
  HTMLDivElement,
  DocumentRowActionsProps
>(function DocumentRowActions({ doc, onDelete, onEdit, onSendForSignature }, ref) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const canManageDocs = useCan("hr:documents:manage");
  const canCreateEnvelope = useCan("sign:envelope:create");
  const hasFileUrl = doc.hasFile;

  function handleView(e: React.MouseEvent) {
    e.stopPropagation();
    if (!hasFileUrl) {
      toast.error("No file attached to this document.");
      return;
    }
    void viewProtectedFile(`/hr/documents/${doc.id}/file`);
  }

  function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    if (!hasFileUrl) {
      toast.error("No file attached to this document.");
      return;
    }
    void downloadProtectedFile(
      `/hr/documents/${doc.id}/file`,
      doc.fileName ?? doc.name,
    );
  }

  function handleVersionHistory(e: React.MouseEvent) {
    e.stopPropagation();
    toast.info(`"${doc.name}" has ${doc.version} versions.`);
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setDeleteOpen(true);
  }

  async function handleConfirmDelete() {
    setIsDeleting(true);
    try {
      await onDelete(doc.id);
      setDeleteOpen(false);
    } catch {
      return;
    } finally {
      setIsDeleting(false);
    }
  }

  function handleEdit(e: React.MouseEvent) {
    e.stopPropagation();
    onEdit(doc);
  }

  function handleMenuTriggerClick(e: React.MouseEvent) {
    e.stopPropagation();
  }

  function handleSendForSignature(e: React.MouseEvent) {
    e.stopPropagation();
    onSendForSignature(doc);
  }

  return (
    <div
      ref={ref}
      className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200"
    >
      <Button
        variant="ghost"
        size="icon"
        className="w-7 text-muted-foreground hover:text-foreground"
        disabled={!hasFileUrl}
        onClick={handleView}
        aria-label="View document"
      >
        <Eye className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="w-7 text-muted-foreground hover:text-foreground"
        disabled={!hasFileUrl}
        onClick={handleDownload}
        aria-label="Download document"
      >
        <Download className="h-3.5 w-3.5" />
      </Button>
      {canManageDocs ? (
        <Button
          variant="ghost"
          size="icon"
          className="w-7 text-muted-foreground hover:text-foreground"
          onClick={handleEdit}
          aria-label="Edit document"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={handleMenuTriggerClick}>
          <AnimatedIconButton
            icon={EllipsisIcon}
            variant="ghost"
            size="icon"
            className="w-7 text-muted-foreground hover:text-foreground"
            aria-label="More options"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem disabled={!hasFileUrl} onClick={handleView}>
            <Eye className="mr-2 h-3.5 w-3.5" />
            View file
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!hasFileUrl} onClick={handleDownload}>
            <Download className="mr-2 h-3.5 w-3.5" />
            Download
          </DropdownMenuItem>
          {canManageDocs ? (
            <DropdownMenuItem onClick={handleEdit}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit details
            </DropdownMenuItem>
          ) : null}
          {canCreateEnvelope ? (
            <DropdownMenuItem onClick={handleSendForSignature}>
              <FileSignature className="mr-2 h-3.5 w-3.5" />
              Send for e-signature
            </DropdownMenuItem>
          ) : null}
          {(doc.version ?? 1) > 1 && (
            <DropdownMenuItem onClick={handleVersionHistory}>
              <History className="mr-2 h-3.5 w-3.5" />
              History ({doc.version})
            </DropdownMenuItem>
          )}
          {canManageDocs && <DropdownMenuSeparator />}
          {canManageDocs && (
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Remove “${doc.name}”?`}
        description="The document will no longer be available in HRMS. Its audit history is preserved."
        confirmLabel="Remove document"
        destructive
        keepOpenOnConfirm
        isPending={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
});
