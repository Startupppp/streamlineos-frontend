"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAddSignField } from "@/hooks/api/sign/fields";
import { useUpdateSignField } from "@/hooks/api/sign/fields";
import type { SignDocument, SignField, SignRecipient } from "@/types/sign";
import { FieldBox } from "./field-box";
import { useBuilder } from "./builder-context";
import { recipientColor } from "./recipient-colors";
import { fieldTypeMeta } from "./field-types";

// pdfjs-dist touches browser-only Canvas APIs (DOMMatrix) at module load time,
// which crashes Next.js SSR even inside a "use client" component — load it
// client-side only.
const PdfCanvas = dynamic(() => import("./pdf-canvas").then((m) => m.PdfCanvas), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  ),
});

interface BuilderCanvasAreaProps {
  envelopeId: number;
  document: SignDocument | undefined;
  documentUrl: string | undefined;
  recipients: SignRecipient[];
  fields: SignField[];
  editable: boolean;
}

export function BuilderCanvasArea({ envelopeId, document, documentUrl, recipients, fields, editable }: BuilderCanvasAreaProps) {
  const [pageCount, setPageCount] = useState(1);
  const { currentPage, setCurrentPage, selectedRecipientId, placingFieldType, setPlacingFieldType, selectedFieldId, setSelectedFieldId } =
    useBuilder();
  const addField = useAddSignField(envelopeId);
  const updateField = useUpdateSignField(envelopeId);

  const recipientIndexById = new Map(recipients.map((r, idx) => [r.id, idx]));
  const pageFields = fields.filter((f) => f.documentId === document?.id && f.pageNumber === currentPage);

  async function handleCanvasClick(xPt: number, yPt: number) {
    if (!document || !placingFieldType || !selectedRecipientId) return;
    const meta = fieldTypeMeta(placingFieldType);
    try {
      await addField.mutateAsync({
        documentId: document.id,
        recipientId: selectedRecipientId,
        fieldType: placingFieldType,
        pageNumber: currentPage,
        x: Math.round(xPt),
        y: Math.round(yPt),
        width: meta.defaultWidth,
        height: meta.defaultHeight,
        required: placingFieldType === "date_signed",
        groupId: placingFieldType === "radio" ? `group-${Date.now()}` : undefined,
        optionsJson: placingFieldType === "dropdown" || placingFieldType === "radio" ? ["Option 1", "Option 2"] : undefined,
      });
      setPlacingFieldType(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function handleMove(fieldId: number, x: number, y: number) {
    void updateField.mutateAsync({ id: fieldId, input: { x: Math.round(x), y: Math.round(y) } }).catch((error) => toast.error(getErrorMessage(error)));
  }

  function handleResize(fieldId: number, width: number, height: number) {
    void updateField
      .mutateAsync({ id: fieldId, input: { width: Math.round(width), height: Math.round(height) } })
      .catch((error) => toast.error(getErrorMessage(error)));
  }

  if (!document || !documentUrl) {
    return (
      <EmptyState
        illustrationPreset="documents"
        illustrationSize="md"
        title="No document selected"
        description="Upload a PDF from the Documents tab to start placing fields."
        compact
        className="flex-1 min-h-0 border-0 bg-transparent"
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-muted/30">
      <div className="shrink-0 flex items-center justify-center gap-3 border-b border-border py-2 bg-background">
        <Button variant="ghost" size="icon" className="size-7" disabled={currentPage <= 1} onClick={() => setCurrentPage(currentPage - 1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-xs text-muted-foreground">
          Page {currentPage} of {pageCount}
        </span>
        <Button variant="ghost" size="icon" className="size-7" disabled={currentPage >= pageCount} onClick={() => setCurrentPage(currentPage + 1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-6 flex justify-center">
        <PdfCanvas
          fileUrl={documentUrl}
          pageNumber={currentPage}
          onPageInfo={(info) => setPageCount(info.pageCount)}
          onCanvasClick={editable ? handleCanvasClick : undefined}
          renderOverlay={(scale) => (
            <>
              {pageFields.map((field) => {
                const idx = recipientIndexById.get(field.recipientId) ?? 0;
                return (
                  <FieldBox
                    key={field.id}
                    field={field}
                    scale={scale}
                    color={recipientColor(idx)}
                    isSelected={selectedFieldId === field.id}
                    onSelect={() => setSelectedFieldId(field.id)}
                    onMove={(x, y) => handleMove(field.id, x, y)}
                    onResize={(w, h) => handleResize(field.id, w, h)}
                  />
                );
              })}
            </>
          )}
        />
      </div>
    </div>
  );
}
