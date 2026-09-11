"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingButton } from "@/components/ui/loading-button";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import { cn } from "@/lib/utils";
import { statusToneClasses } from "@/lib/design-tokens";
import { formatMinorMoney } from "@/lib/accounting/money";
import { formatShortDate } from "@/lib/date-utils";
import type { ReconciliationProof } from "@/types/accounting-banking";

interface RecProofPanelProps {
  proof: ReconciliationProof;
  canReconcile: boolean;
  isReconciling: boolean;
  onMarkReconciled: () => void;
}

const successTone = statusToneClasses("success");
const dangerTone = statusToneClasses("danger");

function ProofLine({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 py-2 last:border-b-0">
      <div className="min-w-0">
        <p className="text-label">{label}</p>
        {note ? <p className="text-dense text-muted-foreground">{note}</p> : null}
      </div>
      <span className="shrink-0 font-mono text-sm tabular-nums">{value}</span>
    </div>
  );
}

export function RecProofPanel({
  proof,
  canReconcile,
  isReconciling,
  onMarkReconciled,
}: RecProofPanelProps) {
  const tone = proof.holds ? successTone : dangerTone;

  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold">Is this money actually there?</CardTitle>
            <p className="text-dense text-muted-foreground">
              {formatShortDate(proof.periodStart)} to {formatShortDate(proof.periodEnd)}
            </p>
          </div>
          {proof.reconciledAt ? (
            <SemanticBadge
              tone="success"
              label={`Signed off ${formatShortDate(proof.reconciledAt)}`}
            />
          ) : (
            <SemanticBadge
              tone={proof.holds ? "success" : "danger"}
              label={proof.holds ? "Adds up" : "Does not add up"}
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0">
        <p
          className={cn(
            "flex items-start gap-2 rounded-md border px-3 py-2 text-label",
            tone.surface,
            tone.ink,
            tone.rule,
          )}
          role={proof.holds ? undefined : "alert"}
        >
          {proof.holds ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{proof.explanation}</span>
        </p>

        <div>
          <ProofLine
            label="What your books say the account holds"
            value={formatMinorMoney(proof.glBalanceMinor, proof.currency)}
            note={`On ${formatShortDate(proof.periodEnd)}`}
          />
          <ProofLine
            label="Movements the books recorded that the bank has not shown"
            value={formatMinorMoney(proof.unmatchedGlMinor, proof.currency)}
            note={`${proof.unmatchedGlLines.length} item(s) — uncleared payments and the like`}
          />
          <ProofLine
            label="What the bank says the account closed at"
            value={formatMinorMoney(proof.statementClosingMinor, proof.currency)}
          />
          <ProofLine
            label="Movements the bank showed that the books have not recorded"
            value={formatMinorMoney(proof.unmatchedStatementMinor, proof.currency)}
            note={`${proof.unmatchedStatementLines.length} item(s) — fees, interest, direct debits`}
          />
          <ProofLine
            label="Left unexplained"
            value={formatMinorMoney(proof.differenceMinor, proof.currency)}
            note={
              proof.holds
                ? "Nothing. The two sides agree once each is stripped of what the other cannot see."
                : "Match or record the outstanding items until this reaches zero."
            }
          />
          {proof.openingVarianceMinor !== 0 ? (
            <ProofLine
              label="Already disagreed before this period began"
              value={formatMinorMoney(proof.openingVarianceMinor, proof.currency)}
              note="Carried in from an earlier period, so it will not be fixed by matching this one."
            />
          ) : null}
        </div>

        {!proof.reconciledAt ? (
          <div className="flex justify-end">
            <LoadingButton
              type="button"
              isPending={isReconciling}
              disabled={!proof.holds || !canReconcile}
              onClick={onMarkReconciled}
            >
              Sign this period off
            </LoadingButton>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
