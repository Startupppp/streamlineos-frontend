"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { FileText, Loader2 } from "lucide-react";
import { Trash2Icon, CloudUploadIcon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDeleteSignDocument, useUploadSignDocument } from "@/hooks/api/sign/documents";
import type { SignDocument } from "@/types/sign";
import { useBuilder } from "./builder-context";

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
            onClick={() => {
              setSelectedDocumentId(doc.id);
              setCurrentPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setSelectedDocumentId(doc.id);
                setCurrentPage(1);
              }
            }}
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
              <AnimatedIconButton variant="ghost" size="icon" icon={Trash2Icon} iconSize={14} className="size-7 shrink-0" onClick={(e) => handleDelete(doc.id, e)} />
            )}
          </div>
        ))
      )}
      {editable && (
        <>
          <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
          <Button variant="outline" size="sm" className="w-full" disabled={upload.isPending} onClick={() => fileInputRef.current?.click()}>
            {upload.isPending ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
            Upload PDF
          </Button>
        </>
      )}
    </div>
  );
}
