"use client";

import { useCallback, type Dispatch } from "react";
import { Plus } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion, LayoutGroup } from "framer-motion";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import type { CrmAutomationEvent, CrmAutomationAction } from "@/types/crm";
import type { BuilderAction, BuilderState } from "./builder-types";
import { TriggerCard, ConditionRowCard, ActionNodeCard, WaitCard } from "./node-cards";
import { BranchNodeCard, ExitNodeCard } from "./branch-exit-cards";

const CONNECTOR_VARIANTS = {
  hidden: { opacity: 0, scaleY: 0 },
  visible: { opacity: 1, scaleY: 1 },
};

interface AutomationFlowCanvasProps {
  state: BuilderState;
  dispatch: Dispatch<BuilderAction>;
  events: CrmAutomationEvent[];
  actions: CrmAutomationAction[];
  registryLoading: boolean;
  registryFailed: boolean;
  registryError: unknown;
  onRetryRegistry: () => void;
}

export function AutomationFlowCanvas({
  state,
  dispatch,
  events,
  actions,
  registryLoading,
  registryFailed,
  registryError,
  onRetryRegistry,
}: AutomationFlowCanvasProps) {
  const shouldReduceMotion = useReducedMotion();

  const handleTriggerChange = useCallback((event: string) => dispatch({ type: "SET_TRIGGER", event }), [dispatch]);

  const handleAddCondition = useCallback(() => dispatch({ type: "ADD_CONDITION" }), [dispatch]);
  const handleUpdateCondition = useCallback((index: number, field: "field" | "operator" | "value", val: string) => {
    dispatch({ type: "UPDATE_CONDITION", index, field, value: val });
  }, [dispatch]);
  const handleRemoveCondition = useCallback((index: number) => dispatch({ type: "REMOVE_CONDITION", index }), [dispatch]);

  const handleAddActionNode = useCallback(() => dispatch({ type: "ADD_NODE", nodeType: "action" }), [dispatch]);
  const handleAddWaitNode = useCallback(() => dispatch({ type: "ADD_NODE", nodeType: "wait" }), [dispatch]);
  const handleUpdateNodeAction = useCallback((nodeId: string, actionKey: string) => dispatch({ type: "UPDATE_NODE_ACTION", nodeId, actionKey }), [dispatch]);
  const handleUpdateNodeConfig = useCallback((nodeId: string, configKey: string, val: string) => dispatch({ type: "UPDATE_NODE_CONFIG", nodeId, configKey, value: val }), [dispatch]);
  const handleUpdateWaitHours = useCallback((nodeId: string, hours: number) => dispatch({ type: "UPDATE_NODE_WAIT_HOURS", nodeId, hours }), [dispatch]);
  const handleRemoveNode = useCallback((nodeId: string) => dispatch({ type: "REMOVE_NODE", nodeId }), [dispatch]);

  const handleAddBranchBranch = useCallback((nodeId: string) => dispatch({ type: "ADD_BRANCH_BRANCH", nodeId }), [dispatch]);
  const handleUpdateBranchCondition = useCallback((nodeId: string, branchIndex: number, field: "field" | "operator" | "value", val: string) => {
    dispatch({ type: "UPDATE_BRANCH_CONDITION", nodeId, branchIndex, field, value: val });
  }, [dispatch]);
  const handleRemoveBranchBranch = useCallback((nodeId: string, branchIndex: number) => dispatch({ type: "REMOVE_BRANCH_BRANCH", nodeId, branchIndex }), [dispatch]);
  const handleAddBranchNode = useCallback(() => dispatch({ type: "ADD_NODE", nodeType: "branch" }), [dispatch]);
  const handleAddExitNode = useCallback(() => dispatch({ type: "ADD_NODE", nodeType: "exit" }), [dispatch]);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(state.nodes);
    const [moved] = reordered.splice(result.source.index, 1);
    if (moved) {
      reordered.splice(result.destination.index, 0, moved);
      dispatch({ type: "REORDER_NODES", nodes: reordered });
    }
  }, [state.nodes, dispatch]);

  const containerVariants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };

  const itemVariants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } };

  return (
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
          ) : registryFailed ? (
            <ErrorState
              compact
              title="Couldn't load triggers and actions"
              description={getErrorMessage(registryError)}
              onRetry={onRetryRegistry}
            />
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
            className="text-xs w-full border-dashed"
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
                            ) : node.nodeType === "branch" ? (
                              <BranchNodeCard
                                node={node}
                                dragHandleProps={draggableProvided.dragHandleProps ?? undefined}
                                onAddBranch={handleAddBranchBranch}
                                onUpdateBranchCondition={handleUpdateBranchCondition}
                                onRemoveBranch={handleRemoveBranchBranch}
                                onRemoveNode={handleRemoveNode}
                              />
                            ) : node.nodeType === "exit" ? (
                              <ExitNodeCard
                                nodeId={node.id}
                                dragHandleProps={draggableProvided.dragHandleProps ?? undefined}
                                onRemove={handleRemoveNode}
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

        <motion.div variants={itemVariants} className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="text-xs flex-1 border-dashed"
            onClick={handleAddActionNode}
          >
            <Plus className="h-3 w-3 mr-1" /> Add Action
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-dashed border-status-warning-rule text-status-warning-ink hover:bg-status-warning-surface"
            onClick={handleAddWaitNode}
          >
            <Plus className="h-3 w-3 mr-1" /> Wait
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-dashed border-primary/30 text-primary hover:bg-primary/5"
            onClick={handleAddBranchNode}
          >
            <Plus className="h-3 w-3 mr-1" /> Branch
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-dashed border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={handleAddExitNode}
          >
            <Plus className="h-3 w-3 mr-1" /> Exit
          </Button>
        </motion.div>
      </motion.div>
    </LayoutGroup>
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
