"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { useSimulateWorkflow } from "@/hooks/api/hr/hr-workflows";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { MemberPicker } from "@/components/members/member-picker";

interface Props {
  workflowId: number | null;
  workflowName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function WorkflowSimulateDialog({
  workflowId,
  workflowName,
  open,
  onOpenChange,
}: Props) {
  const [subjectEmployeeId, setSubjectEmployeeId] = useState("");
  const [contextJson, setContextJson] = useState("{}");
  const simulate = useSimulateWorkflow();

  function handleRun() {
    if (!workflowId || !subjectEmployeeId) {
      toast.error("Select a subject employee");
      return;
    }
    let context: Record<string, unknown> = {};
    try {
      const raw: unknown = JSON.parse(contextJson || "{}");
      if (!isRecord(raw)) throw new Error("not an object");
      context = raw;
    } catch {
      toast.error("Context must be valid JSON");
      return;
    }

    simulate.mutate(
      { workflowId, subjectEmployeeId, context },
      {
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  const result = simulate.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Simulate workflow</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Dry-run approver resolution for {workflowName ?? "this workflow"}. No instance is
            created.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Subject employee</Label>
            <MemberPicker
              value={subjectEmployeeId || undefined}
              onChange={(id) => setSubjectEmployeeId(id ?? "")}
              placeholder="Select employee"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Context JSON (optional)</Label>
            <Input
              value={contextJson}
              onChange={(e) => setContextJson(e.target.value)}
              className="font-mono"
              placeholder='{"amount": 5000}'
            />
          </div>

          <LoadingButton
            className="w-full"
            isPending={simulate.isPending}
            onClick={handleRun}
            disabled={!workflowId || !subjectEmployeeId}
          >
            Run simulation
          </LoadingButton>

          {result && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <p className="text-xs text-muted-foreground">{result.explanation}</p>
              <ul className="space-y-2">
                {result.steps.map((step) => (
                  <li
                    key={step.stepOrder}
                    className="rounded-md border bg-background px-2.5 py-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {step.stepOrder}. {step.name}
                      </span>
                      <Badge variant="outline" className="text-micro">
                        {step.mode}
                      </Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {step.approverType}
                      {!step.conditionPasses && " · condition skipped"}
                    </p>
                    <p className="mt-0.5 font-mono text-dense text-foreground/80 break-all">
                      {step.resolvedApproverUserIds.length > 0
                        ? step.resolvedApproverUserIds.join(", ")
                        : "No approvers resolved"}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
