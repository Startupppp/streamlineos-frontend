"use client";

import { useState, memo } from "react";
import { toast } from "sonner";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useReorderProposal,
  useConfirmReorderProposal,
  type ReorderProposalResponse,
} from "@/hooks/api/inv-ai-explain";
import { ReorderEvidenceCard } from "./reorder-evidence-card";

interface DraftProposalCardProps {
  proposal: ReorderProposalResponse["proposal"];
  productName: string;
  onConfirm: (proposalId: number, token: string) => void;
  isPending: boolean;
}

const DraftProposalCard = memo(function DraftProposalCard({
  proposal,
  productName,
  onConfirm,
  isPending,
}: DraftProposalCardProps) {
  const expiresAt = new Date(proposal.expiresAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function handleConfirmClick(): void {
    onConfirm(proposal.proposalId, proposal.token);
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-dense font-semibold text-foreground">Draft PO Ready</p>
          <p className="text-micro text-muted-foreground">
            Expires {expiresAt} · Proposal {String(proposal.proposalId).slice(0, 8)}…
          </p>
        </div>
        <LoadingButton
          size="sm"
          className="text-micro h-7 px-2 shrink-0"
          isPending={isPending}
          loadingText="Creating…"
          onClick={handleConfirmClick}
        >
          Confirm &amp; Create Draft PO
        </LoadingButton>
      </div>
      <p className="text-micro text-muted-foreground">
        This will create a <span className="font-medium">DRAFT</span> purchase order for{" "}
        {productName}. No stock movements occur until the PO is confirmed.
      </p>
    </div>
  );
});

interface ReorderProposalPanelProps {
  variantId: string;
  variantName: string;
  warehouseId?: string;
}

export const ReorderProposalPanel = memo(function ReorderProposalPanel({
  variantId,
  variantName,
  warehouseId,
}: ReorderProposalPanelProps) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ReorderProposalResponse | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const proposalMutation = useReorderProposal();
  const confirmMutation = useConfirmReorderProposal();

  function handleToggle(): void {
    setOpen((v) => !v);
  }

  function handleExplain(): void {
    if (result) {
      handleToggle();
      return;
    }
    setOpen(true);
    proposalMutation.mutate(
      { variantId, warehouseId },
      {
        onSuccess: (data) => setResult(data),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleConfirm(proposalId: number, token: string): void {
    confirmMutation.mutate(
      { proposalId, token },
      {
        onSuccess: () => {
          setConfirmed(true);
          toast.success("Draft PO created", {
            description: `Purchase order created for ${variantName}.`,
          });
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  const isLoading = proposalMutation.isPending;
  const hasResult = !!result;
  const showToggle = hasResult || isLoading;

  return (
    <Card className="mt-2 border-border/60">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-dense font-semibold text-foreground flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-muted-foreground" />
            AI Reorder Explanation
          </span>
          <div className="flex items-center gap-1.5">
            {!hasResult && (
              <LoadingButton
                size="sm"
                variant="outline"
                className="text-micro h-6 px-2"
                isPending={isLoading}
                loadingText="Analyzing…"
                onClick={handleExplain}
              >
                Get AI Explanation
              </LoadingButton>
            )}
            {showToggle && (
              <button
                onClick={handleToggle}
                className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                aria-label={open ? "Collapse" : "Expand"}
              >
                {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      {open && (
        <>
          <Separator />
          <CardContent className="px-3 pb-3 pt-3">
            {isLoading && !result && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-1.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded-md" />
                  ))}
                </div>
                <Skeleton className="h-12 rounded-md" />
                <Skeleton className="h-8 rounded-md" />
              </div>
            )}

            {proposalMutation.isError && (
              <p className="text-dense text-destructive">
                {getErrorMessage(proposalMutation.error)}
              </p>
            )}

            {result && (
              <div className="space-y-4">
                <ReorderEvidenceCard
                  evidence={result.evidence}
                  explanation={result.explanation}
                />
                <Separator />
                {confirmed ? (
                  <p className="text-dense text-muted-foreground">
                    Draft PO created successfully.
                  </p>
                ) : (
                  <DraftProposalCard
                    proposal={result.proposal}
                    productName={result.evidence.productName}
                    onConfirm={handleConfirm}
                    isPending={confirmMutation.isPending}
                  />
                )}
                {confirmMutation.isError && (
                  <p className="text-dense text-destructive">
                    {getErrorMessage(confirmMutation.error)}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </>
      )}
    </Card>
  );
});
