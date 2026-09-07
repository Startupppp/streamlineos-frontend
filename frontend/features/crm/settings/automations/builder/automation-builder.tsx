"use client";

import { useReducer, useCallback, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { History, FlaskConical } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCrmAutomationRules,
  useCreateCrmAutomationRule,
  useUpdateCrmAutomationRule,
  useAutomationEvents,
  useAutomationActions,
} from "@/hooks/api/crm";
import {
  builderReducer,
  initialBuilderState,
  serializeToGraph,
} from "./builder-types";
import { AutomationFlowCanvas } from "./automation-flow-canvas";
import { AutomationTestPanel } from "./automation-test-panel";
import { RunHistoryDrawer } from "./run-history-drawer";

interface AutomationBuilderProps {
  automationId: string;
}

export function AutomationBuilder({ automationId }: AutomationBuilderProps) {
  const router = useRouter();
  const isNew = automationId === "new";

  const [state, dispatch] = useReducer(builderReducer, initialBuilderState);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [testPanelOpen, setTestPanelOpen] = useState(false);
  const loadedRef = useRef(false);

  const {
    data: rulesData,
    isLoading: rulesLoading,
    isError: rulesFailed,
    error: rulesError,
    refetch: refetchRules,
    access: rulesAccess,
  } = useCrmAutomationRules();
  const {
    data: eventsData,
    isLoading: eventsLoading,
    isError: eventsFailed,
    error: eventsError,
    refetch: refetchEvents,
  } = useAutomationEvents();
  const {
    data: actionsData,
    isLoading: actionsLoading,
    isError: actionsFailed,
    error: actionsError,
    refetch: refetchActions,
  } = useAutomationActions();

  const createRule = useCreateCrmAutomationRule();
  const updateRule = useUpdateCrmAutomationRule();

  const events = eventsData?.events ?? [];
  const actions = actionsData?.actions ?? [];

  useEffect(() => {
    if (!isNew && rulesData && !loadedRef.current) {
      const rule = rulesData.rules.find((r) => r.id === parseInt(automationId, 10));
      if (rule) {
        loadedRef.current = true;
        dispatch({
          type: "LOAD",
          state: {
            name: rule.name,
            triggerEvent: rule.trigger,
            conditions: (rule.conditions ?? []).map((c) => ({
              field: c.field,
              operator: c.operator,
              value: c.value,
            })),
            nodes: [],
            isActive: rule.isActive,
          },
        });
      }
    }
  }, [isNew, rulesData, automationId]);

  const handleRetryRules = useCallback(() => {
    void refetchRules();
  }, [refetchRules]);

  const handleRetryRegistry = useCallback(() => {
    void refetchEvents();
    void refetchActions();
  }, [refetchEvents, refetchActions]);

  const handleToggleTestPanel = useCallback(() => setTestPanelOpen((v) => !v), []);
  const handleCloseTestPanel = useCallback(() => setTestPanelOpen(false), []);
  const handleToggleHistory = useCallback(() => setHistoryOpen((v) => !v), []);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => dispatch({ type: "SET_NAME", name: e.target.value }), []);
  const handleActiveChange = useCallback((isActive: boolean) => dispatch({ type: "SET_ACTIVE", isActive }), []);

  const handleSave = useCallback(() => {
    if (!state.name.trim()) {
      toast.error("Automation name is required");
      return;
    }
    if (!state.triggerEvent) {
      toast.error("Please select a trigger event");
      return;
    }
    const actionKeys: string[] = state.nodes
      .filter((n) => n.nodeType === "action" && n.type)
      .map((n) => n.type);
    const payload = {
      name: state.name,
      trigger: state.triggerEvent,
      conditions: state.conditions.map((c) => ({ field: c.field, operator: "equals" as const, value: c.value })),
      actions: actionKeys,
      isActive: state.isActive,
      isDraft: false,
      graph: serializeToGraph(state.nodes),
      cooldownMinutes: 0,
    };
    if (isNew) {
      createRule.mutate(payload, {
        onSuccess: () => {
          toast.success("Automation created");
          router.push("/crm/settings/automations");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    } else {
      updateRule.mutate({ id: parseInt(automationId, 10), ...payload }, {
        onSuccess: () => toast.success("Automation saved"),
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    }
  }, [state, isNew, createRule, updateRule, automationId, router]);

  const isPending = createRule.isPending || updateRule.isPending;
  const ruleId = isNew ? 0 : parseInt(automationId, 10);

  const isPageLoading = !isNew && rulesLoading;
  const registryLoading = eventsLoading || actionsLoading;
  const registryFailed = eventsFailed || actionsFailed;
  const registryError = eventsError ?? actionsError;
  const existingRule = isNew
    ? undefined
    : rulesData?.rules.find((rule) => rule.id === ruleId);

  if (isPageLoading) {
    return (
      <PageWrapper title="Loading..." backHref="/crm/settings/automations">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      </PageWrapper>
    );
  }

  if (!isNew && rulesFailed) {
    return (
      <PageWrapper title="Automation" backHref="/crm/settings/automations">
        <ErrorState
          className="flex-1"
          title="Couldn't load this automation"
          description={getErrorMessage(rulesError)}
          onRetry={handleRetryRules}
        />
      </PageWrapper>
    );
  }

  if (!isNew && !existingRule) {
    return (
      <PageWrapper title="Automation" backHref="/crm/settings/automations">
        <EmptyState
          className="flex-1"
          illustrationPreset="automations"
          title="Automation not found"
          description="This automation no longer exists, or it was removed by someone else."
          action={{ label: "Back to automations", href: "/crm/settings/automations" }}
          access={rulesAccess}
        />
      </PageWrapper>
    );
  }

  return (
    <>
      {!isNew && (
        <RunHistoryDrawer ruleId={ruleId} open={historyOpen} onOpenChange={setHistoryOpen} />
      )}

      <PageWrapper
        title={isNew ? "New Automation" : (state.name || "Automation Builder")}
        subtitle={!isNew ? (
          <span className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-micro h-4 px-1.5">
              v{existingRule?.version ?? 1}{existingRule?.isDraft ? " · draft" : ""}
            </Badge>
          </span>
        ) : undefined}
        backHref="/crm/settings/automations"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={handleToggleTestPanel}>
              <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
              Test
            </Button>
            {!isNew && (
              <Button variant="outline" size="sm" className="text-xs" onClick={handleToggleHistory}>
                <History className="h-3.5 w-3.5 mr-1.5" />
                History
              </Button>
            )}
            <LoadingButton size="sm" className="text-xs" onClick={handleSave} isPending={isPending} loadingText="Saving...">
              Save
            </LoadingButton>
          </div>
        }
      >
        <div className="flex gap-6 min-h-0">
          <div className="flex-1 min-w-0 space-y-2 pb-8">
            <div className="mb-4 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Automation Name</Label>
                <Input
                  className="text-sm"
                  placeholder="e.g. Notify team on hot lead"
                  value={state.name}
                  onChange={handleNameChange}
                />
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border p-3 bg-muted/20">
                <Switch checked={state.isActive} onCheckedChange={handleActiveChange} />
                <span className="text-xs text-muted-foreground">Active</span>
              </div>
            </div>

            <AutomationFlowCanvas
              state={state}
              dispatch={dispatch}
              events={events}
              actions={actions}
              registryLoading={registryLoading}
              registryFailed={registryFailed}
              registryError={registryError}
              onRetryRegistry={handleRetryRegistry}
            />
          </div>

          <AnimatePresence>
            {testPanelOpen && (
              <AutomationTestPanel ruleId={ruleId} isNew={isNew} onClose={handleCloseTestPanel} />
            )}
          </AnimatePresence>
        </div>
      </PageWrapper>
    </>
  );
}
