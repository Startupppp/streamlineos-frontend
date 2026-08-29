import { Badge } from "@/components/ui/badge";
import { CheckCircle2, MinusCircle, XCircle } from "lucide-react";
import type { AutomationTestResult } from "@/hooks/api/automations";

interface AutomationTestResultPanelProps {
  result: AutomationTestResult;
}

function ActionResultBadge({ status }: { status: AutomationTestResult["status"] }) {
  if (status === "success") {
    return <Badge variant="default" className="gap-1 text-dense"><CheckCircle2 className="h-3 w-3" /> Matched</Badge>;
  }
  if (status === "skipped") {
    return <Badge variant="secondary" className="gap-1 text-dense"><MinusCircle className="h-3 w-3" /> Skipped</Badge>;
  }
  return <Badge variant="destructive" className="gap-1 text-dense"><XCircle className="h-3 w-3" /> Failed</Badge>;
}

export function AutomationTestResultPanel({ result }: AutomationTestResultPanelProps) {
  return (
    <div className="mx-6 mb-4 rounded-lg border border-border/60 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Test result</p>
        <ActionResultBadge status={result.status} />
      </div>
      {result.matched ? (
        <div className="space-y-1">
          {result.actionResults.map((action, index) => (
            <div key={`${action.type}-${index}`} className="flex items-start gap-2 text-xs">
              {action.ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-status-success-ink" /> : <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-destructive" />}
              <span className="min-w-0 break-words text-muted-foreground">{action.type}{action.error ? ` — ${action.error}` : ""}</span>
            </div>
          ))}
        </div>
      ) : <p className="text-xs text-muted-foreground">Conditions did not match the sample payload — no actions ran.</p>}
    </div>
  );
}
