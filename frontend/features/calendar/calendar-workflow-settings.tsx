"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { ShieldCheck } from "lucide-react";
import { useCalendarWorkflowEffects, useCalendarWorkflowPolicy, useCalendarWorkflowRules } from "@/hooks/api/calendar-workflows";
import { CalendarWorkflowDryRunCard } from "./calendar-workflow-dry-run-card";
import { CalendarWorkflowEffectsCard } from "./calendar-workflow-effects-card";
import { CalendarWorkflowPolicyCard } from "./calendar-workflow-policy-card";
import { CalendarWorkflowRulesCard } from "./calendar-workflow-rules-card";
import { CalendarDeveloperSettingsCard } from "./calendar-developer-settings-card";

export function CalendarWorkflowSettings() {
  const policy = useCalendarWorkflowPolicy();
  const rules = useCalendarWorkflowRules();
  const effects = useCalendarWorkflowEffects();
  const loading = policy.isLoading || rules.isLoading || effects.isLoading;
  const error = policy.isError || rules.isError || effects.isError;

  if (loading) return <div className="space-y-4"><Skeleton className="h-52 w-full" /><Skeleton className="h-72 w-full" /></div>;
  if (error || !policy.data || !rules.data || !effects.data) return <ErrorState title="Workflow settings could not be loaded" onRetry={() => void Promise.all([policy.refetch(), rules.refetch(), effects.refetch()])} />;

  return (
    <div className="space-y-5">
      <Alert><ShieldCheck /><AlertTitle>Execution-time safety</AlertTitle><AlertDescription>Queued notifications are suppressed when the tenant policy, rule version, allowed channel, quiet hours, or recipient consent no longer permits delivery.</AlertDescription></Alert>
      <CalendarWorkflowPolicyCard policy={policy.data} />
      <CalendarWorkflowRulesCard rules={rules.data} />
      <CalendarWorkflowDryRunCard />
      <CalendarWorkflowEffectsCard effects={effects.data} />
      <CalendarDeveloperSettingsCard />
    </div>
  );
}
