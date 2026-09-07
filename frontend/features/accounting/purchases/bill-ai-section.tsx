"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AiActionsMenu, type AiAction } from "@/components/ai";
import { DocumentExtractPanel } from "@/features/accounting/ai/document-extract-panel";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import type { PurchaseBill } from "@/types/accounting";
import type {
  VarianceExplainResult,
  ExtractedDocumentDraft,
} from "@/hooks/api/accounting/accounting-ai";
import { explainVarianceContract } from "@/hooks/api/accounting/accounting-ai-schema";

interface BillAiSectionProps {
  bill: PurchaseBill;
}

function narrationToText(result: VarianceExplainResult): string {
  const parts: string[] = [];

  if (result.factors.length > 0) {
    parts.push(
      "Contributing factors:\n" + result.factors.map((f) => `• ${f}`).join("\n"),
    );
  }

  parts.push(`AI Narration:\n${result.narration}`);

  if (result.suggestedInvestigations.length > 0) {
    parts.push(
      "Suggested Investigations:\n" +
        result.suggestedInvestigations.map((s) => `• ${s}`).join("\n"),
    );
  }

  return parts.join("\n\n");
}

function buildBillActions(bill: PurchaseBill): AiAction[] {
  const total = Number(bill.total);
  const subtotal = Number(bill.subtotal);
  const taxTotal =
    Number(bill.cgstAmount ?? 0) +
    Number(bill.sgstAmount ?? 0) +
    Number(bill.igstAmount ?? 0);

  return [
    {
      key: "explain-bill",
      label: "Explain bill spend",
      description: "AI narrates bill composition and tax evidence",
      run: async (signal) => {
        const result = await apiClient.post(
          "/finance/ai/variance-explain",
          {
            periodLabel: bill.billDate ?? "Unknown date",
            accountName: bill.expenseAccountCode ?? "Accounts Payable",
            accountCode: bill.expenseAccountCode ?? "2000",
            budgetAmount: subtotal,
            actualAmount: total,
            varianceAmount: taxTotal,
            variancePct: subtotal > 0 ? (taxTotal / subtotal) * 100 : 0,
            notes: bill.notes ?? undefined,
          },
          { signal },
          explainVarianceContract,
        );
        return { text: narrationToText(result) };
      },
    },
  ];
}

export function BillAiSection({ bill }: BillAiSectionProps) {
  const canAi = useCan("accounting:ai:use");
  const [extractOpen, setExtractOpen] = useState(false);

  function handleToggleExtract(): void {
    setExtractOpen((v) => !v);
  }

  function handleDraftReady(_: ExtractedDocumentDraft, sourceName: string): void {
    setExtractOpen(false);
    void Promise.resolve(sourceName);
  }

  if (!canAi) return null;

  const actions = buildBillActions(bill);

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold">AI Assistance</CardTitle>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleExtract}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            {extractOpen ? "Hide" : "Extract document"}
          </button>
          <AiActionsMenu
            actions={actions}
            triggerLabel="AI"
            menuLabel="Bill AI"
            align="end"
          />
        </div>
      </CardHeader>

      {extractOpen && (
        <>
          <Separator />
          <CardContent className="px-4 pb-4 pt-3">
            <div className="mb-2 rounded-md border border-status-warning-rule bg-status-warning-surface px-3 py-2">
              <p className="text-xs text-status-warning-ink">
                AI extracts fields as a human-reviewed draft. Always verify before saving.
                AI never posts or approves entries automatically.
              </p>
            </div>
            <DocumentExtractPanel onDraftReady={handleDraftReady} />
          </CardContent>
        </>
      )}
    </Card>
  );
}
