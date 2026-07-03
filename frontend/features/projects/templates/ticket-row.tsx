"use client";

import type { ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GripVertical, Trash2 } from "lucide-react";

export interface TicketDraft {
  title: string;
  type: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  phase: string;
  estimatedHours: string;
  order: number;
}

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const TICKET_TYPES = ["TASK", "STORY", "BUG", "EPIC"] as const;

interface TicketRowProps {
  ticket: TicketDraft;
  index: number;
  isOnlyTicket: boolean;
  onUpdate: <K extends keyof TicketDraft>(
    idx: number,
    field: K,
    value: TicketDraft[K],
  ) => void;
  onRemove: (idx: number) => void;
}

export function TicketRow({
  ticket,
  index,
  isOnlyTicket,
  onUpdate,
  onRemove,
}: TicketRowProps) {
  function handleTitleChange(e: ChangeEvent<HTMLInputElement>) {
    onUpdate(index, "title", e.target.value);
  }
  function handleTypeChange(v: string) {
    onUpdate(index, "type", v);
  }
  function handlePriorityChange(v: string) {
    onUpdate(index, "priority", v as TicketDraft["priority"]);
  }
  function handleRemove() {
    onRemove(index);
  }
  function handlePhaseChange(e: ChangeEvent<HTMLInputElement>) {
    onUpdate(index, "phase", e.target.value);
  }
  function handleEstimatedHoursChange(e: ChangeEvent<HTMLInputElement>) {
    onUpdate(index, "estimatedHours", e.target.value);
  }

  return (
    <div className="border rounded-md p-3 space-y-2">
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          className="flex-1"
          placeholder="Task title *"
          value={ticket.title}
          onChange={handleTitleChange}
        />
        <Select value={ticket.type} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-24 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TICKET_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ticket.priority} onValueChange={handlePriorityChange}>
          <SelectTrigger className="w-24 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-destructive shrink-0 active:scale-[0.98]"
          disabled={isOnlyTicket}
          onClick={handleRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex gap-2">
        <Input
          className="text-xs"
          placeholder="Phase (e.g. Setup, Development)"
          value={ticket.phase}
          onChange={handlePhaseChange}
        />
        <Input
          type="number"
          min={0}
          className="w-24 text-xs"
          placeholder="Est. hrs"
          value={ticket.estimatedHours}
          onChange={handleEstimatedHoursChange}
        />
      </div>
    </div>
  );
}
