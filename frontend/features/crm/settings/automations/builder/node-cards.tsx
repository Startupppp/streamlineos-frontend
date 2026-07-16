"use client";

import { memo, useCallback } from "react";
import { GripVertical } from "lucide-react";
import { XIcon } from "@animateicons/react/lucide";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CrmAutomationEvent, CrmAutomationAction } from "@/types/crm";
import type { BuilderCondition, BuilderNode } from "./builder-types";

interface TriggerCardProps {
  value: string;
  events: CrmAutomationEvent[];
  onChange: (value: string) => void;
}

export const TriggerCard = memo(function TriggerCard({ value, events, onChange }: TriggerCardProps) {
  return (
    <motion.div
      layout
      className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px] font-bold">T</div>
        <span className="text-sm font-semibold text-primary">Trigger</span>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Event</Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="text-xs">
            <SelectValue placeholder="Select trigger event" />
          </SelectTrigger>
          <SelectContent>
            {events.map((e) => (
              <SelectItem key={e.key} value={e.key} className="text-xs">
                {e.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </motion.div>
  );
});

interface ConditionRowCardProps {
  condition: BuilderCondition;
  index: number;
  onUpdate: (index: number, field: keyof BuilderCondition, val: string) => void;
  onRemove: (index: number) => void;
}

const OPERATORS = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "gt", label: "greater than" },
  { value: "lt", label: "less than" },
  { value: "contains", label: "contains" },
  { value: "in", label: "in list" },
  { value: "changed_to", label: "changed to" },
] as const;

export const ConditionRowCard = memo(function ConditionRowCard({ condition, index, onUpdate, onRemove }: ConditionRowCardProps) {
  const handleFieldChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onUpdate(index, "field", e.target.value), [index, onUpdate]);
  const handleOperatorChange = useCallback((val: string) => onUpdate(index, "operator", val), [index, onUpdate]);
  const handleValueChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onUpdate(index, "value", e.target.value), [index, onUpdate]);
  const handleRemove = useCallback(() => onRemove(index), [index, onRemove]);

  return (
    <motion.div layout className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <Input
          className="text-xs flex-1 min-w-0"
          placeholder="field"
          value={condition.field}
          onChange={handleFieldChange}
        />
        <Select value={condition.operator} onValueChange={handleOperatorChange}>
          <SelectTrigger className="text-xs w-[110px] shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPERATORS.map((op) => (
              <SelectItem key={op.value} value={op.value} className="text-xs">{op.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className="text-xs flex-1 min-w-0"
          placeholder="value"
          value={condition.value}
          onChange={handleValueChange}
        />
      </div>
      <AnimatedIconButton icon={XIcon} iconSize={12} variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive" onClick={handleRemove} />
    </motion.div>
  );
});

interface ActionNodeCardProps {
  node: BuilderNode;
  actions: CrmAutomationAction[];
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  onUpdateAction: (nodeId: string, actionKey: string) => void;
  onUpdateConfig: (nodeId: string, configKey: string, val: string) => void;
  onRemove: (nodeId: string) => void;
}

export const ActionNodeCard = memo(function ActionNodeCard({ node, actions, dragHandleProps, onUpdateAction, onUpdateConfig, onRemove }: ActionNodeCardProps) {
  const handleActionChange = useCallback((val: string) => onUpdateAction(node.id, val), [node.id, onUpdateAction]);
  const handleRemove = useCallback(() => onRemove(node.id), [node.id, onRemove]);

  const action = actions.find((a) => a.key === node.type);
  const schema = action?.configSchema ?? {};
  const schemaKeys = Object.keys(schema);

  return (
    <motion.div
      layout
      className="rounded-xl border border-border bg-card p-3 shadow-sm"
    >
      <div className="flex items-start gap-2">
        <div {...(dragHandleProps ?? {})} className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground shrink-0">
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">A</div>
              <Select value={node.type ?? ""} onValueChange={handleActionChange}>
                <SelectTrigger className="text-xs w-[180px]">
                  <SelectValue placeholder="Select action" />
                </SelectTrigger>
                <SelectContent>
                  {actions.map((a) => (
                    <SelectItem key={a.key} value={a.key} className="text-xs">{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <AnimatedIconButton icon={XIcon} iconSize={12} variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0" onClick={handleRemove} />
          </div>
          {schemaKeys.length > 0 && (
            <div className="grid grid-cols-2 gap-2 pl-7">
              {schemaKeys.map((key) => (
                <div key={key} className="space-y-0.5">
                  <Label className="text-[10px] text-muted-foreground capitalize">{key}</Label>
                  <Input
                    className="text-xs"
                    placeholder={key}
                    value={String(node.config?.[key] ?? "")}
                    onChange={(e) => onUpdateConfig(node.id, key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

interface WaitCardProps {
  waitHours: number;
  onChangeHours: (hours: number) => void;
  onRemove: () => void;
}

export const WaitCard = memo(function WaitCard({ waitHours, onChangeHours, onRemove }: WaitCardProps) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10);
    if (!isNaN(v) && v >= 0) onChangeHours(v);
  }, [onChangeHours]);

  return (
    <motion.div layout className="rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10 p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center text-[10px] font-bold text-amber-700 dark:text-amber-300">W</div>
          <span className="text-xs font-medium text-amber-700 dark:text-amber-300">Wait</span>
          <Input
            type="number"
            min={0}
            className="text-xs w-16"
            value={waitHours}
            onChange={handleChange}
          />
          <span className="text-xs text-muted-foreground">hours</span>
        </div>
        <AnimatedIconButton icon={XIcon} iconSize={12} variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={onRemove} />
      </div>
    </motion.div>
  );
});
