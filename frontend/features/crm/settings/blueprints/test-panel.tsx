"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { useTestTransition } from "@/hooks/api/crm";
import type { CrmPipelineStage } from "@/types/crm/metadata";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

export interface TestPanelProps {
  blueprintId: string;
  stages: CrmPipelineStage[];
}

export function TestPanel({ blueprintId, stages }: TestPanelProps) {
  const [fromKey, setFromKey] = useState("");
  const [toKey, setToKey] = useState("");
  const [sampleFields, setSampleFields] = useState<{ key: string; value: string }[]>([
    { key: "", value: "" },
  ]);
  const testTransition = useTestTransition(blueprintId);

  const handleAddRow = useCallback(() => {
    setSampleFields((prev) => [...prev, { key: "", value: "" }]);
  }, []);

  const handleFieldKeyChange = useCallback(
    (idx: number, val: string) => {
      setSampleFields((prev) => {
        const next = [...prev];
        const row = next[idx];
        if (row) next[idx] = { ...row, key: val };
        return next;
      });
    },
    []
  );

  const handleFieldValChange = useCallback(
    (idx: number, val: string) => {
      setSampleFields((prev) => {
        const next = [...prev];
        const row = next[idx];
        if (row) next[idx] = { ...row, value: val };
        return next;
      });
    },
    []
  );

  const handleTest = useCallback(() => {
    if (!fromKey || !toKey) {
      toast.error("Select both stages to test");
      return;
    }
    const fields: Record<string, string> = {};
    for (const row of sampleFields) {
      if (row.key.trim()) fields[row.key.trim()] = row.value;
    }
    testTransition.mutate(
      { fromStageKey: fromKey, toStageKey: toKey, sampleFields: fields },
      { onError: (err) => toast.error(getErrorMessage(err)) }
    );
  }, [fromKey, toKey, sampleFields, testTransition]);

  const handleFromChange = useCallback((v: string) => setFromKey(v), []);
  const handleToChange = useCallback((v: string) => setToKey(v), []);

  return (
    <Card className="bg-card border border-border rounded-xl shadow-sm">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-sm font-semibold">Test Transition</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="flex items-center gap-2">
          <Select value={fromKey} onValueChange={handleFromChange}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="From stage" />
            </SelectTrigger>
            <SelectContent>
              {stages.map((s) => (
                <SelectItem key={s.key} value={s.key} className="text-xs">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground text-xs">→</span>
          <Select value={toKey} onValueChange={handleToChange}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="To stage" />
            </SelectTrigger>
            <SelectContent>
              {stages.map((s) => (
                <SelectItem key={s.key} value={s.key} className="text-xs">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Sample Fields
          </div>
          {sampleFields.map((row, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <Input
                value={row.key}
                onChange={(e) => handleFieldKeyChange(idx, e.target.value)}
                placeholder="field"
                className="h-8 text-xs flex-1"
              />
              <Input
                value={row.value}
                onChange={(e) => handleFieldValChange(idx, e.target.value)}
                placeholder="value"
                className="h-8 text-xs flex-1"
              />
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={handleAddRow}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add field
          </Button>
        </div>

        <LoadingButton
          size="sm"
          className="h-8 text-xs"
          onClick={handleTest}
          isPending={testTransition.isPending}
          loadingText="Testing…"
        >
          Test
        </LoadingButton>

        {testTransition.data && (
          <div
            className={cn(
              "rounded-lg border p-3 text-xs space-y-1",
              testTransition.data.allowed
                ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                : "border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-800 dark:text-red-300"
            )}
          >
            <div className="font-semibold">
              {testTransition.data.allowed ? "Transition allowed" : "Transition blocked"}
            </div>
            {!testTransition.data.allowed && testTransition.data.missing.length > 0 && (
              <ul className="list-disc list-inside space-y-0.5">
                {testTransition.data.missing.map((m) => (
                  <li key={m} className="text-[11px]">
                    {m}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
