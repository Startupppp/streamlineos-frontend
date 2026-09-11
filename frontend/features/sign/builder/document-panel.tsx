"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { Trash2Icon, CloudUploadIcon } from "@animateicons/react/lucide";
import { LoadingButton } from "@/components/ui/loading-button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDeleteSignDocument, useUploadSignDocument } from "@/hooks/api/sign/documents";
import type { SignDocument } from "@/types/sign";
import { useBuilder } from "./builder-context";
import { isActivationKey } from "@/lib/keyboard-activation";

interface DocumentPanelProps {
  envelopeId: number;
  documents: SignDocument[];
  editable: boolean;
}

export function DocumentPanel({ envelopeId, documents, editable }: DocumentPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadSignDocument(envelopeId);
  const deleteDocument = useDeleteSignDocument(envelopeId);
  const { selectedDocumentId, setSelectedDocumentId, setCurrentPage } = useBuilder();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const doc = await upload.mutateAsync(file);
      setSelectedDocumentId(doc.id);
      setCurrentPage(1);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function selectDocument(id: number) {
    return function handleDocumentSelected(): void {
      setSelectedDocumentId(id);
      setCurrentPage(1);
    };
  }

  function selectDocumentOnActivationKey(id: number) {
    const select = selectDocument(id);
    return function handleDocumentActivationKey(e: React.KeyboardEvent): void {
      if (!isActivationKey(e)) return;
      select();
    };
  }

  async function handleDelete(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await deleteDocument.mutateAsync(id);
      if (selectedDocumentId === id) setSelectedDocumentId(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="space-y-2">
      {documents.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No documents uploaded yet.</p>
      ) : (
        documents.map((doc) => (
          <div
            key={doc.id}
            role="button"
            tabIndex={0}
            onClick={selectDocument(doc.id)}
            onKeyDown={selectDocumentOnActivationKey(doc.id)}
            className={`w-full flex items-center gap-2 rounded-lg border p-2.5 text-left transition-colors cursor-pointer ${
              selectedDocumentId === doc.id ? "border-foreground bg-muted" : "border-border hover:bg-muted/50"
            }`}
          >
            <FileText className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{doc.fileName}</p>
              <p className="text-xs text-muted-foreground">{doc.pageCount ?? "?"} page(s)</p>
            </div>
            {editable && (
              <AnimatedIconButton variant="ghost" size="icon" icon={Trash2Icon} iconSize={14} className="size-7 shrink-0" aria-label="Remove document" onClick={(e) => handleDelete(doc.id, e)} />
            )}
          </div>
        ))
      )}
      {editable && (
        <>
          <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
          <LoadingButton
            variant="outline"
            size="sm"
            className="w-full"
            isPending={upload.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {!upload.isPending && <CloudUploadIcon size={14} className="mr-1.5" />}
            Upload PDF
          </LoadingButton>
        </>
      )}
    </div>
  );
}
