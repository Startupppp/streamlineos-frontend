"use client";

import { useReducer, useCallback, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronLeft, History, FlaskConical, Save } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion, LayoutGroup } from "framer-motion";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCrmAutomationRules,
  useCreateCrmAutomationRule,
  useUpdateCrmAutomationRule,
  useTestCrmAutomationRule,
  useAutomationEvents,
  useAutomationActions,
} from "@/hooks/api/crm";
import {
  builderReducer,
  initialBuilderState,
  type BuilderNode,
} from "./builder-types";
import { TriggerCard, ConditionRowCard, ActionNodeCard, WaitCard } from "./node-cards";
import { RunHistoryDrawer } from "./run-history-drawer";

interface AutomationBuilderProps {
  automationId: string;
}

const CONNECTOR_VARIANTS = {
  hidden: { opacity: 0, scaleY: 0 },
  visible: { opacity: 1, scaleY: 1 },
};

export function AutomationBuilder({ automationId }: AutomationBuilderProps) {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const isNew = automationId === "new";

  const [state, dispatch] = useReducer(builderReducer, initialBuilderState);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [testPayload, setTestPayload] = useState<Array<{ key: string; value: string }>>([{ key: "", value: "" }]);
  const [testPanelOpen, setTestPanelOpen] = useState(false);
  const [testResult, setTestResult] = useState<{ matched: boolean; nodes: Array<{ nodeId: string; type: string; result: string }> } | null>(null);
  const loadedRef = useRef(false);

  const { data: rulesData, isLoading: rulesLoading } = useCrmAutomationRules();
  const { data: eventsData, isLoading: eventsLoading } = useAutomationEvents();
  const { data: actionsData, isLoading: actionsLoading } = useAutomationActions();

  const createRule = useCreateCrmAutomationRule();
  const updateRule = useUpdateCrmAutomationRule();
  const testRule = useTestCrmAutomationRule();

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

  const handleBack = useCallback(() => router.push("/crm/settings/automations"), [router]);
  const handleToggleTestPanel = useCallback(() => setTestPanelOpen((v) => !v), []);
  const handleToggleHistory = useCallback(() => setHistoryOpen((v) => !v), []);

  const handleTriggerChange = useCallback((event: string) => dispatch({ type: "SET_TRIGGER", event }), []);
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => dispatch({ type: "SET_NAME", name: e.target.value }), []);
  const handleActiveChange = useCallback((isActive: boolean) => dispatch({ type: "SET_ACTIVE", isActive }), []);

  const handleAddCondition = useCallback(() => dispatch({ type: "ADD_CONDITION" }), []);
  const handleUpdateCondition = useCallback((index: number, field: "field" | "operator" | "value", val: string) => {
    dispatch({ type: "UPDATE_CONDITION", index, field, value: val });
  }, []);
  const handleRemoveCondition = useCallback((index: number) => dispatch({ type: "REMOVE_CONDITION", index }), []);

  const handleAddActionNode = useCallback(() => dispatch({ type: "ADD_NODE", nodeType: "action" }), []);
  const handleAddWaitNode = useCallback(() => dispatch({ type: "ADD_NODE", nodeType: "wait" }), []);
  const handleUpdateNodeAction = useCallback((nodeId: string, actionKey: string) => dispatch({ type: "UPDATE_NODE_ACTION", nodeId, actionKey }), []);
  const handleUpdateNodeConfig = useCallback((nodeId: string, configKey: string, val: string) => dispatch({ type: "UPDATE_NODE_CONFIG", nodeId, configKey, value: val }), []);
  const handleUpdateWaitHours = useCallback((nodeId: string, hours: number) => dispatch({ type: "UPDATE_NODE_WAIT_HOURS", nodeId, hours }), []);
  const handleRemoveNode = useCallback((nodeId: string) => dispatch({ type: "REMOVE_NODE", nodeId }), []);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(state.nodes);
    const [moved] = reordered.splice(result.source.index, 1);
    if (moved) {
      reordered.splice(result.destination.index, 0, moved);
      dispatch({ type: "REORDER_NODES", nodes: reordered });
    }
  }, [state.nodes]);

  const handleSave = useCallback(() => {
    if (!state.name.trim()) {
      toast.error("Automation name is required");
      return;
    }
    if (!state.triggerEvent) {
      toast.error("Please select a trigger event");
      return;
    }
    const actions: string[] = state.nodes
      .filter((n) => n.nodeType === "action" && n.type)
      .map((n) => n.type);
    const payload = {
      name: state.name,
      trigger: state.triggerEvent,
      conditions: state.conditions.map((c) => ({ field: c.field, operator: "equals" as const, value: c.value })),
      actions,
      isActive: state.isActive,
      executionCount: 0,
      lastRunAt: null,
      version: 1,
      isDraft: false,
      graph: null,
      cooldownMinutes: 0,
      createdAt: null,
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

  const handleRunTest = useCallback(() => {
    const samplePayload = Object.fromEntries(
      testPayload.filter((p) => p.key.trim()).map((p) => [p.key, p.value]),
    );
    if (isNew) {
      toast.info("Save the automation first to run a test");
      return;
    }
    testRule.mutate(
      { id: parseInt(automationId, 10), payload: samplePayload },
      {
        onSuccess: (data) => {
          setTestResult(data as { matched: boolean; nodes: Array<{ nodeId: string; type: string; result: string }> });
          toast.success("Test complete");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [testPayload, isNew, testRule, automationId]);

  const handleAddTestPayloadRow = useCallback(() => setTestPayload((p) => [...p, { key: "", value: "" }]), []);

  const isPending = createRule.isPending || updateRule.isPending;
  const ruleId = isNew ? 0 : parseInt(automationId, 10);

  const isPageLoading = !isNew && rulesLoading;
  const registryLoading = eventsLoading || actionsLoading;

  if (isPageLoading) {
    return (
      <PageWrapper title="Loading..." backHref="/crm/settings/automations">
        <div className="space-y-3 max-w-2xl">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      </PageWrapper>
    );
  }

  const containerVariants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };

  const itemVariants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };

  return (
    <>
      {!isNew && (
        <RunHistoryDrawer ruleId={ruleId} open={historyOpen} onOpenChange={setHistoryOpen} />
      )}

      <PageWrapper
        title={isNew ? "New Automation" : (state.name || "Automation Builder")}
        subtitle={!isNew ? (
          <span className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] h-4 px-1.5">
              v{(rulesData?.rules.find((r) => r.id === ruleId)?.version ?? 1)}{(rulesData?.rules.find((r) => r.id === ruleId)?.isDraft) ? " · draft" : ""}
            </Badge>
          </span>
        ) : undefined}
        backHref="/crm/settings/automations"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleToggleTestPanel}>
              <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
              Test
            </Button>
            {!isNew && (
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleToggleHistory}>
                <History className="h-3.5 w-3.5 mr-1.5" />
                History
              </Button>
            )}
            <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={isPending}>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        }
      >
        <div className="flex gap-6 min-h-0">
          <div className="flex-1 min-w-0 space-y-2 max-w-2xl pb-8">
            <div className="mb-4 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Automation Name</Label>
                <Input
                  className="h-8 text-sm"
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

            <LayoutGroup>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-2"
              >
                <motion.div variants={itemVariants}>
                  {registryLoading ? (
                    <Skeleton className="h-20 w-full rounded-xl" />
                  ) : (
                    <TriggerCard value={state.triggerEvent} events={events} onChange={handleTriggerChange} />
                  )}
                </motion.div>

                {state.conditions.length > 0 && (
                  <motion.div variants={itemVariants} className="rounded-xl border border-border bg-muted/10 p-3 space-y-2">
                    <span className="text-xs font-medium text-muted-foreground">Conditions (all must match)</span>
                    <AnimatePresence>
                      {state.conditions.map((cond, i) => (
                        <ConditionRowCard
                          key={i}
                          condition={cond}
                          index={i}
                          onUpdate={handleUpdateCondition}
                          onRemove={handleRemoveCondition}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}

                <motion.div variants={itemVariants}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs w-full border-dashed"
                    onClick={handleAddCondition}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Condition
                  </Button>
                </motion.div>

                <Connector shouldReduceMotion={shouldReduceMotion} />

                <motion.div variants={itemVariants}>
                  <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="nodes">
                      {(droppableProvided) => (
                        <div
                          ref={droppableProvided.innerRef}
                          {...droppableProvided.droppableProps}
                          className="space-y-2"
                        >
                          <AnimatePresence>
                            {state.nodes.map((node, index) => (
                              <Draggable key={node.id} draggableId={node.id} index={index}>
                                {(draggableProvided) => (
                                  <div
                                    ref={draggableProvided.innerRef}
                                    {...draggableProvided.draggableProps}
                                  >
                                    {node.nodeType === "wait" ? (
                                      <WaitCard
                                        waitHours={node.waitHours ?? 24}
                                        onChangeHours={(h) => handleUpdateWaitHours(node.id, h)}
                                        onRemove={() => handleRemoveNode(node.id)}
                                      />
                                    ) : (
                                      <ActionNodeCard
                                        node={node}
                                        actions={actions}
                                        dragHandleProps={draggableProvided.dragHandleProps ?? undefined}
                                        onUpdateAction={handleUpdateNodeAction}
                                        onUpdateConfig={handleUpdateNodeConfig}
                                        onRemove={handleRemoveNode}
                                      />
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            ))}
                          </AnimatePresence>
                          {droppableProvided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </motion.div>

                <motion.div variants={itemVariants} className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs flex-1 border-dashed"
                    onClick={handleAddActionNode}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add Action
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-dashed border-amber-300 text-amber-700 hover:bg-amber-50"
                    onClick={handleAddWaitNode}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Wait
                  </Button>
                </motion.div>
              </motion.div>
            </LayoutGroup>
          </div>

          <AnimatePresence>
            {testPanelOpen && (
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
                    onClick={handleToggleTestPanel}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Sample Payload</Label>
                  {testPayload.map((row, i) => (
                    <div key={i} className="flex gap-1.5">
                      <Input
                        className="h-7 text-xs"
                        placeholder="key"
                        value={row.key}
                        onChange={(e) => setTestPayload((p) => p.map((r, idx) => idx === i ? { ...r, key: e.target.value } : r))}
                      />
                      <Input
                        className="h-7 text-xs"
                        placeholder="value"
                        value={row.value}
                        onChange={(e) => setTestPayload((p) => p.map((r, idx) => idx === i ? { ...r, value: e.target.value } : r))}
                      />
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="h-7 text-xs w-full" onClick={handleAddTestPayloadRow}>
                    <Plus className="h-3 w-3 mr-1" /> Row
                  </Button>
                </div>
                <Button
                  size="sm"
                  className="h-8 text-xs w-full"
                  onClick={handleRunTest}
                  disabled={testRule.isPending}
                >
                  {testRule.isPending ? "Running..." : "Run Test"}
                </Button>
                {testResult && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className={`text-xs font-medium ${testResult.matched ? "text-emerald-600" : "text-red-500"}`}>
                      {testResult.matched ? "Conditions matched" : "Conditions did not match"}
                    </div>
                    <div className="space-y-1">
                      {testResult.nodes.map((n) => (
                        <div key={n.nodeId} className={`flex items-center gap-1.5 text-[11px] rounded px-2 py-1 ${n.result === "pass" || n.result === "ok" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                          <span className="font-medium">{n.type}</span>
                          <span className="text-[10px] opacity-70">{n.result}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </PageWrapper>
    </>
  );
}

function Connector({ shouldReduceMotion }: { shouldReduceMotion: boolean | null }) {
  return (
    <motion.div
      variants={CONNECTOR_VARIANTS}
      className="flex items-center justify-center py-1"
      style={{ transformOrigin: "top" }}
      transition={shouldReduceMotion ? { duration: 0 } : undefined}
    >
      <div className="w-0.5 h-6 bg-border rounded-full" />
    </motion.div>
  );
}
