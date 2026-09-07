"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useHrAutomationEvents, useTestHrAutomation } from "@/hooks/api/hr/hr-automations";
import type { HrAutomationRule, HrTestResult } from "@/types/hr/automations";
import { CheckCircle, XCircle } from "lucide-react";

interface Props {
  rule: HrAutomationRule;
  onClose: () => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function AutomationTestDialog({ rule, onClose }: Props) {
  const { data: eventsData } = useHrAutomationEvents();
  const test = useTestHrAutomation();
  const [result, setResult] = useState<HrTestResult | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const samplePayload = eventsData?.events.find((e) => e.value === rule.triggerEvent)?.samplePayload ?? {};
  const [payloadText, setPayloadText] = useState(JSON.stringify(samplePayload, null, 2));

  function handlePayloadChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setPayloadText(e.target.value);
    setJsonError(null);
    setResult(null);
  }

  function handleRun() {
    let parsed: Record<string, unknown>;
    try {
      const raw: unknown = JSON.parse(payloadText);
      if (!isRecord(raw)) throw new Error("not an object");
      parsed = raw;
    } catch {
      setJsonError("Invalid JSON — please fix before running.");
      return;
    }
    setJsonError(null);
    test.mutate(
      { id: rule.id, payload: parsed },
      {
        onSuccess: (data) => {
          setResult(data);
          toast.success(data.matched ? "Rule matched — actions would run" : "Rule did not match");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Test Automation</DialogTitle>
          <DialogDescription>
            Dry-run <span className="font-medium">{rule.name}</span> with a sample payload. Nothing is written.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs mb-1 block">
              Sample payload for <Badge variant="secondary" className="text-micro">{rule.triggerEvent}</Badge>
            </Label>
            <Textarea
              value={payloadText}
              onChange={handlePayloadChange}
              rows={8}
              className="font-mono text-xs resize-none"
            />
            {jsonError && <p className="text-xs text-destructive mt-1">{jsonError}</p>}
          </div>

          {result && (
            <div className="space-y-3 border border-border rounded-lg p-3">
              <div className="flex items-center gap-2">
                {result.matched ? (
                  <CheckCircle className="h-4 w-4 text-status-success-ink" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">
                  {result.matched ? "Conditions matched" : "Conditions did not match"}
                </span>
              </div>

              {result.matchedConditions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-micro font-semibold text-muted-foreground uppercase tracking-wider">Condition Checks</p>
                  {result.matchedConditions.map((mc, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className={`h-1.5 w-1.5 rounded-full ${mc.matched ? "bg-status-success-fill" : "bg-status-danger-fill"}`} />
                      <span className="font-mono text-muted-foreground">{mc.condition.field} {mc.condition.operator} {String(mc.condition.value)}</span>
                    </div>
                  ))}
                </div>
              )}

              {result.matched && result.wouldRunActions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-micro font-semibold text-muted-foreground uppercase tracking-wider">Would Run Actions</p>
                  {result.wouldRunActions.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">{i + 1}.</span>
                      <Badge variant="outline" className="text-micro">{a.type}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
          <LoadingButton isPending={test.isPending} loadingText="Running…" onClick={handleRun}>
            Run Dry Test
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
