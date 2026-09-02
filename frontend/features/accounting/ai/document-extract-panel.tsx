"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { AiDraftCard, AiGeneratedLabel, AiFailureBody } from "@/components/ai";
import { useExtractDocument } from "@/hooks/api/accounting/accounting-ai";
import type { ExtractedDocumentDraft, ExtractedLineItem } from "@/hooks/api/accounting/accounting-ai";

interface DocumentExtractPanelProps {
  onDraftReady?: (draft: ExtractedDocumentDraft, sourceName: string) => void;
  className?: string;
}

function fmt(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function LineItemsTable({ items }: { items: ExtractedLineItem[] }) {
  const [expanded, setExpanded] = React.useState(false);

  function handleToggle() {
    setExpanded((v) => !v);
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={handleToggle}
        className="text-xs font-semibold text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
      >
        Line items ({items.length}) {expanded ? "▲" : "▼"}
      </button>
      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted/60">
                <th className="text-left px-2 py-1.5 font-medium text-muted-foreground border border-border/40">Description</th>
                <th className="text-right px-2 py-1.5 font-medium text-muted-foreground border border-border/40">Qty</th>
                <th className="text-right px-2 py-1.5 font-medium text-muted-foreground border border-border/40">Unit Price</th>
                <th className="text-right px-2 py-1.5 font-medium text-muted-foreground border border-border/40">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-card" : "bg-muted/10"}>
                  <td className="px-2 py-1.5 border border-border/40">{item.description}</td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums border border-border/40">
                    {item.quantity ?? "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums border border-border/40">
                    {fmt(item.unitPrice)}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums border border-border/40">
                    {fmt(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryTable({ draft }: { draft: ExtractedDocumentDraft }) {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Vendor", value: draft.vendor },
    { label: "Date", value: draft.documentDate ?? "—" },
    { label: "Number", value: draft.documentNumber ?? "—" },
    { label: "Currency", value: draft.currency },
    { label: "Subtotal", value: fmt(draft.subtotalAmount) },
    { label: "Tax", value: fmt(draft.taxAmount) },
    { label: "Total", value: fmt(draft.totalAmount) },
    { label: "Payment Terms", value: draft.paymentTerms ?? "—" },
  ];

  return (
    <table className="w-full text-xs border-collapse">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b border-border/40 last:border-0">
            <td className="py-1.5 pr-3 font-medium text-muted-foreground w-32">{row.label}</td>
            <td className="py-1.5 font-mono tabular-nums text-foreground">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DocumentExtractPanel({ onDraftReady, className }: DocumentExtractPanelProps) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const mutation = useExtractDocument();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    mutation.reset();
  }

  function handleExtract() {
    if (!selectedFile) return;
    const reader = new FileReader();

    reader.onload = function onReaderLoad() {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") return;
      const base64 = dataUrl.split(",")[1] ?? "";
      mutation.mutate({
        fileBase64: base64,
        mimeType: selectedFile.type,
        sourceDocumentName: selectedFile.name,
      });
    };

    reader.readAsDataURL(selectedFile);
  }

  function handleReset() {
    setSelectedFile(null);
    mutation.reset();
  }

  function handleUseDraft() {
    if (!mutation.data) return;
    onDraftReady?.(mutation.data.draft, mutation.data.sourceDocumentName);
  }

  const confidenceColors: Record<"high" | "medium" | "low", string> = {
    high: "text-status-success-ink",
    medium: "text-status-warning-ink",
    low: "text-status-danger-ink",
  };

  return (
    <div className={cn("space-y-4", className)}>
      {!mutation.data && (
        <div className="space-y-3">
          <div className="flex flex-col gap-2">
            <label htmlFor="doc-extract-file" className="text-xs font-medium text-muted-foreground">
              Upload document
            </label>
            <input
              id="doc-extract-file"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="block text-xs text-muted-foreground file:mr-3 file:rounded file:border-0 file:bg-muted file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-foreground hover:file:bg-muted/70 cursor-pointer"
            />
            {selectedFile && (
              <p className="text-dense text-muted-foreground">
                Selected: <span className="font-medium text-foreground">{selectedFile.name}</span>
              </p>
            )}
          </div>

          <LoadingButton
            size="sm"
            isPending={mutation.isPending}
            loadingText="Extracting…"
            disabled={!selectedFile}
            onClick={handleExtract}
          >
            Extract with AI
          </LoadingButton>

          {mutation.error && (
            <AiFailureBody error={mutation.error} onRetry={handleExtract} />
          )}
        </div>
      )}

      {mutation.data && (
        <AiDraftCard timestamp={mutation.data.generatedAt}>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <AiGeneratedLabel timestamp={mutation.data.generatedAt} />
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-micro font-medium border",
                  mutation.data.confidence === "high"
                    ? "border-status-success-rule bg-status-success-surface"
                    : mutation.data.confidence === "medium"
                      ? "border-status-warning-rule bg-status-warning-surface"
                      : "border-status-danger-rule bg-status-danger-surface",
                  confidenceColors[mutation.data.confidence],
                )}
              >
                {mutation.data.confidence} confidence
              </span>
            </div>

            <div className="rounded-md border border-status-warning-rule bg-status-warning-surface px-3 py-2.5">
              <p className="text-xs text-status-warning-ink leading-relaxed">
                {mutation.data.warningMessage}
              </p>
            </div>

            <SummaryTable draft={mutation.data.draft} />

            {mutation.data.draft.lineItems.length > 0 && (
              <LineItemsTable items={mutation.data.draft.lineItems} />
            )}

            {mutation.data.draft.notes && (
              <p className="text-xs text-muted-foreground italic">{mutation.data.draft.notes}</p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" onClick={handleUseDraft} className="h-7 text-xs">
                Use this draft
              </Button>
              <Button size="sm" variant="ghost" onClick={handleReset} className="h-7 text-xs text-muted-foreground">
                Extract another
              </Button>
            </div>
          </div>
        </AiDraftCard>
      )}
    </div>
  );
}
