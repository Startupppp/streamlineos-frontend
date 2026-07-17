"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { UserCombobox } from "@/components/ui/user-combobox";
import { usePolicyPreview } from "@/hooks/api/hr/policies";
import { SCOPE_TYPE_LABELS } from "@/types/hr/policies";
import { TruncatedText } from "@/components/ui/truncated-text";

interface Props {
  policyId: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function PolicyPreviewDialog({ policyId, open, onOpenChange }: Props) {
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]!);
  const [queryParams, setQueryParams] = useState<{
    employeeId: string;
    date: string;
  } | null>(null);

  const { data, isFetching } = usePolicyPreview(policyId, queryParams);

  const handleRun = useCallback(() => {
    if (!employeeId.trim() || !date) return;
    setQueryParams({ employeeId: employeeId.trim(), date });
  }, [employeeId, date]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] max-w-lg flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4">
          <DialogTitle className="text-base font-semibold">Preview Policy</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4 px-6 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Employee
              </Label>
              <UserCombobox
                value={employeeId}
                onChange={setEmployeeId}
                placeholder="Select employee"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Date
              </Label>
              <Input
                type="date"
                className="text-xs"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <LoadingButton
            className="w-full h-8 text-sm"
            isPending={isFetching}
            loadingText="Evaluating..."
            onClick={handleRun}
            disabled={!employeeId.trim() || !date}
          >
            Evaluate Policy
          </LoadingButton>

          {queryParams && !isFetching && (
            <div className="rounded-lg border border-border p-3 space-y-3 bg-muted/30">
              {data ? (
                <>
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <TruncatedText text={data.policy.name ?? ""} className="text-sm font-medium min-w-0 flex-1" />
                    <Badge variant="outline" className="text-xs shrink-0">
                      v{data.policy.version}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Matched Scopes
                    </p>
                    {data.trace.matchedScopes.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-xs text-foreground/80"
                      >
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {SCOPE_TYPE_LABELS[s.scopeType as keyof typeof SCOPE_TYPE_LABELS] ?? s.scopeType}
                        </Badge>
                        <TruncatedText text={s.scopeValue || "(org)"} className="font-mono min-w-0 flex-1" />
                        <span className="ml-auto text-muted-foreground">
                          specificity {s.specificity}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Resolution
                    </p>
                    <p className="text-xs text-foreground/80">
                      Max specificity: <span className="font-mono">{data.trace.maxSpecificity}</span>
                      {" · "}Priority: <span className="font-mono">{data.trace.priority}</span>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Resolved Rules
                    </p>
                    <pre className="text-[10px] font-mono bg-background rounded p-2 border border-border overflow-auto max-h-32">
                      {JSON.stringify(data.rules, null, 2)}
                    </pre>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No active policy matched this employee and date.
                </p>
              )}
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
