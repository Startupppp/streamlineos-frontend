"use client";

import { useCallback, useState } from "react";
import { Plus, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/get-error-message";
import { useTestCrmAutomationRule } from "@/hooks/api/crm";

interface TestResultNode {
  nodeId: string;
  type: string;
  result: string;
}

interface TestResult {
  matched: boolean;
  nodes: TestResultNode[];
}

interface AutomationTestPanelProps {
  ruleId: number;
  isNew: boolean;
  onClose: () => void;
}

export function AutomationTestPanel({ ruleId, isNew, onClose }: AutomationTestPanelProps) {
  const [testPayload, setTestPayload] = useState<Array<{ key: string; value: string }>>([{ key: "", value: "" }]);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const testRule = useTestCrmAutomationRule();

  const handleRunTest = useCallback(() => {
    const samplePayload = Object.fromEntries(
      testPayload.filter((p) => p.key.trim()).map((p) => [p.key, p.value]),
    );
    if (isNew) {
      toast.info("Save the automation first to run a test");
      return;
    }
    testRule.mutate(
      { id: ruleId, payload: samplePayload },
      {
        onSuccess: (data) => {
          setTestResult(data);
          toast.success("Test complete");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [testPayload, isNew, testRule, ruleId]);

  const handleAddTestPayloadRow = useCallback(() => setTestPayload((p) => [...p, { key: "", value: "" }]), []);

  return (
    <motion.aside
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="w-72 shrink-0 rounded-xl border border-border bg-card p-4 space-y-3 self-start sticky top-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Test Panel</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          aria-label="Close test panel"
          onClick={onClose}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Sample Payload</Label>
        {testPayload.map((row, i) => (
          <div key={i} className="flex gap-1.5">
            <Input
              className="text-xs"
              placeholder="key"
              value={row.key}
              onChange={(e) => setTestPayload((p) => p.map((r, idx) => idx === i ? { ...r, key: e.target.value } : r))}
            />
            <Input
              className="text-xs"
              placeholder="value"
              value={row.value}
              onChange={(e) => setTestPayload((p) => p.map((r, idx) => idx === i ? { ...r, value: e.target.value } : r))}
            />
          </div>
        ))}
        <Button variant="outline" size="sm" className="text-xs w-full" onClick={handleAddTestPayloadRow}>
          <Plus className="h-3 w-3 mr-1" /> Row
        </Button>
      </div>
      <LoadingButton
        size="sm"
        className="text-xs w-full"
        onClick={handleRunTest}
        isPending={testRule.isPending}
        loadingText="Running..."
      >
        Run Test
      </LoadingButton>
      {testResult && (
        <div className="space-y-2 pt-2 border-t border-border">
          <div className={`text-xs font-medium ${testResult.matched ? "text-status-success-ink" : "text-status-danger-ink"}`}>
            {testResult.matched ? "Conditions matched" : "Conditions did not match"}
          </div>
          <div className="space-y-1">
            {testResult.nodes.map((n) => (
              <div key={n.nodeId} className={`flex items-center gap-1.5 text-dense rounded px-2 py-1 ${n.result === "pass" || n.result === "ok" ? "bg-status-success-surface text-status-success-ink" : "bg-status-danger-surface text-status-danger-ink"}`}>
                <span className="font-medium">{n.type}</span>
                <span className="text-micro opacity-70">{n.result}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.aside>
  );
}
