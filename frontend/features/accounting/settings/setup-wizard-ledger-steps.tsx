"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSystemAccounts } from "@/hooks/api/accounting/fin-settings";
import { useGeneratePeriods } from "@/hooks/api/accounting/core";
import { SystemAccountMapDialog } from "@/features/accounting/settings/fin-settings-dialogs";
import { getPurposeLabel } from "@/features/accounting/settings/fin-settings-labels";
import type { SystemAccountMapping } from "@/types/accounting/fin-settings";
import type { StepProps } from "./setup-wizard-steps";

export function StepSystemAccounts({ onComplete, onSkip }: StepProps) {
  const [editMapping, setEditMapping] = useState<SystemAccountMapping | null>(null);
  const systemAccountsQuery = useSystemAccounts();
  const accounts = systemAccountsQuery.data ?? [];

  function handleCloseMappingDialog(v: boolean): void {
    if (!v) setEditMapping(null);
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">System Accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {systemAccountsQuery.isError && (
            <p className="text-xs text-destructive" role="alert">
              Couldn&apos;t load system account mappings: {getErrorMessage(systemAccountsQuery.error)}
            </p>
          )}
          <div className="divide-y divide-border rounded-lg border overflow-hidden">
            {accounts.map((m) => (
              <div key={m.purpose} className="flex items-center justify-between px-3 py-2 hover:bg-muted/30">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">{getPurposeLabel(m.purpose)}</p>
                  {m.mapped ? (
                    <p className="text-xs text-muted-foreground font-mono">{m.accountCode} — {m.accountName}</p>
                  ) : (
                    <Badge variant="secondary" className="text-micro mt-0.5 text-status-warning-ink bg-status-warning-surface border-status-warning-rule">Not mapped</Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="h-6 text-xs shrink-0 ml-2" onClick={() => setEditMapping(m)}>
                  Map
                </Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={onComplete}>Continue</Button>
            <Button type="button" variant="ghost" size="sm" onClick={onSkip}>Skip</Button>
          </div>
        </CardContent>
      </Card>

      {editMapping && (
        <SystemAccountMapDialog
          mapping={editMapping}
          open={!!editMapping}
          onOpenChange={handleCloseMappingDialog}
        />
      )}
    </>
  );
}

export function StepPeriods({ onComplete, onSkip }: StepProps) {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [result, setResult] = useState<{ created: number } | null>(null);
  const generatePeriods = useGeneratePeriods();

  function handleYearChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setYear(e.target.value);
  }

  function handleGenerate(): void {
    const y = Number(year);
    if (!y || y < 2000 || y > 2100) return;
    generatePeriods.mutate(
      { year: y },
      {
        onSuccess: (res) => {
          toast.success(`${res.created} periods created`);
          setResult({ created: res.created });
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Accounting Periods</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Generate monthly accounting periods for a fiscal year. You can add more years later.
        </p>
        <div className="flex items-end gap-3">
          <div className="space-y-1.5">
            <Label>Fiscal year</Label>
            <Input
              type="number"
              value={year}
              onChange={handleYearChange}
              className="w-28"
              min={2000}
              max={2100}
            />
          </div>
          <LoadingButton
            size="sm"
            isPending={generatePeriods.isPending}
            loadingText="Generating…"
            onClick={handleGenerate}
          >
            Generate periods
          </LoadingButton>
        </div>
        {result !== null && (
          <div className="flex items-center gap-2 text-sm text-status-success-ink bg-status-success-surface border border-status-success-rule rounded-lg px-3 py-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {result.created} periods created for {year}
          </div>
        )}
        <div className="flex gap-2">
          {result !== null && <Button size="sm" onClick={onComplete}>Continue</Button>}
          <Button type="button" variant="ghost" size="sm" onClick={onSkip}>Skip</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function StepOpeningBalances({ onComplete, onSkip }: StepProps) {
  const [done, setDone] = useState(false);

  function handleMarkDone(): void {
    setDone(true);
    onComplete();
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Opening Balances</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Enter your opening balances to record the financial state at the start of your accounting period.
          This is done on the Opening Balances page.
        </p>
        <div className="flex items-center gap-3">
          <Button asChild size="sm" variant="outline">
            <Link href="/accounting/opening-balances" target="_blank" className="flex items-center gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              Go to Opening Balances
            </Link>
          </Button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleMarkDone} disabled={done}>
            {done ? "Marked as done" : "Mark as done"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onSkip}>Skip</Button>
        </div>
      </CardContent>
    </Card>
  );
}
