"use client";

import { useState, useCallback, useId } from "react";
import { useSourceOverride } from "@/hooks/common/use-source-override";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { ACTION_TYPES } from "@/hooks/api/build/automations";
import {
  useAutomationAiPolicy,
  useUpdateAutomationAiPolicy,
  useAutomationToolPermissions,
  useUpdateAutomationToolPermissions,
  useAutomationTokenQuota,
  useAutomationHumanConfirmation,
  useUpdateAutomationHumanConfirmation,
  type AutomationAiPolicyInput,
  type AutomationToolPermissionsInput,
  type AutomationHumanConfirmationInput,
} from "@/hooks/api/build/automation-settings";
import { FIELD_CLASS } from "./automation-schema";

type ToolName = AutomationToolPermissionsInput["allowedTools"][number];
type ConfirmableAction = AutomationHumanConfirmationInput["actionTypes"][number];

const TOOL_CATALOG: ReadonlyArray<{ value: ToolName; label: string }> = [
  { value: "ticket.summarize", label: "Summarize" },
  { value: "ticket.improve-description", label: "Improve description" },
  { value: "ticket.suggest-subtasks", label: "Suggest subtasks" },
  { value: "ticket.suggest-fields", label: "Suggest fields" },
  { value: "ticket.generate-checklist", label: "Generate checklist" },
  { value: "ticket.suggest-title", label: "Suggest title" },
];

function toggled<T>(prev: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(prev);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

interface ToggleRowProps<T extends string> {
  value: T;
  label: string;
  checked: boolean;
  disabled: boolean;
  onToggle: (value: T) => void;
}

function ToggleRow<T extends string>({ value, label, checked, disabled, onToggle }: ToggleRowProps<T>) {
  const id = useId();
  const handleChange = useCallback(() => onToggle(value), [onToggle, value]);
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={checked} onCheckedChange={handleChange} disabled={disabled} />
      <Label htmlFor={id} className="text-xs font-normal">
        {label}
      </Label>
    </div>
  );
}

interface AutomationSettingsTabProps {
  projectId: number;
  automationId: number;
}

function AiPolicySection({ projectId, automationId, canManage }: AutomationSettingsTabProps & { canManage: boolean }) {
  const modelId = useId();
  const tokensId = useId();
  const temperatureId = useId();
  const { data: aiPolicy, isLoading } = useAutomationAiPolicy(projectId, automationId);
  const updateAiPolicy = useUpdateAutomationAiPolicy(projectId, automationId);
  const [model, setModel] = useSourceOverride(aiPolicy, aiPolicy?.model ?? "");
  const [maxTokens, setMaxTokens] = useSourceOverride(
    aiPolicy,
    aiPolicy?.maxTokensPerRun == null ? "" : String(aiPolicy.maxTokensPerRun),
  );
  const [temperature, setTemperature] = useSourceOverride(
    aiPolicy,
    aiPolicy?.temperature == null ? "" : String(aiPolicy.temperature),
  );

  const handleModelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setModel(e.target.value), [setModel]);
  const handleMaxTokensChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setMaxTokens(e.target.value), [setMaxTokens]);
  const handleTemperatureChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setTemperature(e.target.value), [setTemperature]);

  const handleSave = useCallback(() => {
    const body: AutomationAiPolicyInput = {};
    if (model.trim()) body.model = model.trim();
    const parsedTokens = Number.parseInt(maxTokens, 10);
    if (!Number.isNaN(parsedTokens)) body.maxTokensPerRun = parsedTokens;
    const parsedTemperature = Number.parseFloat(temperature);
    if (!Number.isNaN(parsedTemperature)) body.temperature = parsedTemperature;
    updateAiPolicy.mutate(body, {
      onSuccess: () => toast.success("AI policy saved."),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [model, maxTokens, temperature, updateAiPolicy]);

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold text-foreground">AI policy</h3>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Loading AI policy" />
      ) : (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor={modelId} className="text-xs text-muted-foreground">Model</Label>
            <Input id={modelId} className={FIELD_CLASS} value={model} onChange={handleModelChange} disabled={!canManage} />
          </div>
          <div className="space-y-1">
            <Label htmlFor={tokensId} className="text-xs text-muted-foreground">Max tokens per run</Label>
            <Input id={tokensId} type="number" min="1" max="100000" className={FIELD_CLASS} value={maxTokens} onChange={handleMaxTokensChange} disabled={!canManage} />
          </div>
          <div className="space-y-1">
            <Label htmlFor={temperatureId} className="text-xs text-muted-foreground">Temperature (0–2)</Label>
            <Input id={temperatureId} type="number" step="0.1" min="0" max="2" className={FIELD_CLASS} value={temperature} onChange={handleTemperatureChange} disabled={!canManage} />
          </div>
          {canManage ? (
            <LoadingButton size="sm" type="button" className={cn(FIELD_CLASS, "w-full")} isPending={updateAiPolicy.isPending} loadingText="Saving…" onClick={handleSave}>
              Save AI policy
            </LoadingButton>
          ) : null}
        </div>
      )}
    </section>
  );
}

function ToolPermissionsSection({ projectId, automationId, canManage }: AutomationSettingsTabProps & { canManage: boolean }) {
  const { data: toolPerms, isLoading } = useAutomationToolPermissions(projectId, automationId);
  const updateToolPerms = useUpdateAutomationToolPermissions(projectId, automationId);
  const [selected, setSelected] = useSourceOverride<typeof toolPerms, ReadonlySet<ToolName>>(
    toolPerms,
    toolPerms ? new Set(toolPerms.allowedTools) : new Set(),
  );

  const handleToggle = useCallback((tool: ToolName) => setSelected((prev) => toggled(prev, tool)), [setSelected]);

  const handleSave = useCallback(() => {
    updateToolPerms.mutate(
      { allowedTools: TOOL_CATALOG.map((t) => t.value).filter((t) => selected.has(t)) },
      {
        onSuccess: () => toast.success("Tool permissions saved."),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [selected, updateToolPerms]);

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold text-foreground">Allowed tools</h3>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Loading tool permissions" />
      ) : (
        <div className="space-y-1.5">
          {TOOL_CATALOG.map((tool) => (
            <ToggleRow key={tool.value} value={tool.value} label={tool.label} checked={selected.has(tool.value)} disabled={!canManage} onToggle={handleToggle} />
          ))}
          {canManage ? (
            <LoadingButton size="sm" type="button" className={cn(FIELD_CLASS, "mt-1 w-full")} isPending={updateToolPerms.isPending} loadingText="Saving…" onClick={handleSave}>
              Save tool permissions
            </LoadingButton>
          ) : null}
        </div>
      )}
    </section>
  );
}

function TokenQuotaSection({ projectId, automationId }: AutomationSettingsTabProps) {
  const { data: quota, isLoading } = useAutomationTokenQuota(projectId, automationId);
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold text-foreground">Token quota (this period)</h3>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Loading token quota" />
      ) : quota ? (
        <dl className="space-y-0.5 rounded-md border border-border bg-muted/40 p-2.5 text-xs">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Used</dt>
            <dd className="font-mono tabular-nums">{quota.tokensUsedThisPeriod.toLocaleString()}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Quota</dt>
            <dd className="font-mono tabular-nums">{quota.quotaLimit.toLocaleString()}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Resets</dt>
            <dd>{new Date(quota.resetAt).toLocaleDateString()}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}

function HumanConfirmationSection({ projectId, automationId, canManage }: AutomationSettingsTabProps & { canManage: boolean }) {
  const requireId = useId();
  const { data: stored, isLoading } = useAutomationHumanConfirmation(projectId, automationId);
  const updateHumanConf = useUpdateAutomationHumanConfirmation(projectId, automationId);
  const [requireConfirmation, setRequireConfirmation] = useSourceOverride(
    stored,
    stored?.requireConfirmation ?? false,
  );
  const [actionTypes, setActionTypes] = useSourceOverride<typeof stored, ReadonlySet<ConfirmableAction>>(
    stored,
    stored ? new Set(stored.actionTypes) : new Set(),
  );

  const handleRequireChange = useCallback((checked: boolean | "indeterminate") => setRequireConfirmation(checked === true), [setRequireConfirmation]);
  const handleToggle = useCallback((type: ConfirmableAction) => setActionTypes((prev) => toggled(prev, type)), [setActionTypes]);

  const handleSave = useCallback(() => {
    updateHumanConf.mutate(
      { requireConfirmation, actionTypes: ACTION_TYPES.map((a) => a.value).filter((a) => actionTypes.has(a)) },
      {
        onSuccess: () => toast.success("Confirmation settings saved."),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [requireConfirmation, actionTypes, updateHumanConf]);

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Loading confirmation settings" />;
  }

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold text-foreground">Human confirmation</h3>
      <div className="flex items-center gap-2">
        <Checkbox id={requireId} checked={requireConfirmation} onCheckedChange={handleRequireChange} disabled={!canManage} />
        <Label htmlFor={requireId} className="text-xs font-normal">
          Send matching actions to the approval queue instead of running them
        </Label>
      </div>
      {requireConfirmation ? (
        <div className="space-y-1.5 pl-5">
          <p className="text-xs text-muted-foreground">Require confirmation for:</p>
          {ACTION_TYPES.map((a) => (
            <ToggleRow key={a.value} value={a.value} label={a.label} checked={actionTypes.has(a.value)} disabled={!canManage} onToggle={handleToggle} />
          ))}
        </div>
      ) : null}
      {canManage ? (
        <LoadingButton size="sm" type="button" className={cn(FIELD_CLASS, "w-full")} isPending={updateHumanConf.isPending} loadingText="Saving…" onClick={handleSave}>
          Save confirmation settings
        </LoadingButton>
      ) : null}
    </section>
  );
}

export function AutomationSettingsTab({ projectId, automationId }: AutomationSettingsTabProps) {
  const canManage = useCan("build:manage");
  return (
    <div className="space-y-6">
      <AiPolicySection projectId={projectId} automationId={automationId} canManage={canManage} />
      <ToolPermissionsSection projectId={projectId} automationId={automationId} canManage={canManage} />
      <TokenQuotaSection projectId={projectId} automationId={automationId} />
      <HumanConfirmationSection projectId={projectId} automationId={automationId} canManage={canManage} />
    </div>
  );
}
