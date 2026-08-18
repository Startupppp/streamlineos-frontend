"use client";

import { useCallback } from "react";
import { nanoid } from "nanoid";
import { GripVertical, PlusCircle } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ChecklistItem } from "@/types/hr/templates";

const ASSIGNEE_ROLES = [
  { value: "hr", label: "HR" },
  { value: "manager", label: "Manager" },
  { value: "it", label: "IT" },
  { value: "employee", label: "Employee" },
  { value: "buddy", label: "Buddy" },
] as const;

interface ChecklistEditorProps {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}

export function ChecklistEditor({ items, onChange }: ChecklistEditorProps) {
  const handleAdd = useCallback(() => {
    onChange([
      ...items,
      {
        id: nanoid(8),
        title: "",
        assigneeRole: "employee",
        dueOffsetDays: 0,
        required: true,
        order: items.length,
      },
    ]);
  }, [items, onChange]);

  const handleRemove = useCallback(
    (checklistItemId: string) => {
      onChange(
        items
          .filter((item) => item.id !== checklistItemId)
          .map((item, index) => ({ ...item, order: index })),
      );
    },
    [items, onChange],
  );

  const handleChange = useCallback(
    (checklistItemId: string, patch: Partial<ChecklistItem>) => {
      onChange(
        items.map((item) =>
          item.id === checklistItemId ? { ...item, ...patch } : item,
        ),
      );
    },
    [items, onChange],
  );

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Task title"
            value={item.title}
            onChange={(e) => handleChange(item.id, { title: e.target.value })}
            className="flex-1 min-w-0"
          />
          <Select
            value={item.assigneeRole}
            onValueChange={(v) => handleChange(item.id, { assigneeRole: v as ChecklistItem["assigneeRole"] })}
          >
            <SelectTrigger className="w-28 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSIGNEE_ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[11px] text-muted-foreground">Day</span>
            <Input
              type="number"
              min={-30}
              max={365}
              value={item.dueOffsetDays}
              onChange={(e) => handleChange(item.id, { dueOffsetDays: Number(e.target.value) })}
              className="w-16 text-center"
            />
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Switch
              checked={item.required}
              onCheckedChange={(v) => handleChange(item.id, { required: v })}
              className="scale-75"
            />
            <span className="text-[11px] text-muted-foreground">Req</span>
          </div>
          <TooltipIconButton
            icon={Trash2Icon}
            iconSize={14}
            label="Remove Task"
            type="button"
            className="w-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => handleRemove(item.id)}
          />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleAdd}>
        <PlusCircle className="h-3.5 w-3.5" />
        Add Task
      </Button>
    </div>
  );
}
