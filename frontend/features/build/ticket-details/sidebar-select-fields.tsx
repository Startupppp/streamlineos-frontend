"use client";

import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { Input } from "@/components/ui/input";
import {
  Circle,
  Timer,
  CheckCircle2,
  AlertCircle,
  Zap,
  Boxes,
  RotateCcw,
} from "lucide-react";
import { parseTicketPointsInput } from "../shared/ticket-points";
import { MAX_TICKET_POINTS } from "@/lib/validation/projects";
import { statusConfig } from "@/features/build/shared/types";

interface Epic {
  id: number;
  title: string;
}

interface Module {
  id: number;
  name: string;
}

interface Cycle {
  id: number;
  name: string;
  status: string;
}

interface Status {
  name: string;
  id: number;
}

interface SidebarSelectFieldsProps {
  ticket: {
    id: number;
    status?: string | null;
    priority?: string | null;
    type?: string | null;
    points?: number | null;
    epicId?: number | null;
    moduleId?: number | null;
    cycleId?: number | null;
  };
  statuses?: Status[];
  epics: Epic[];
  modules: Module[];
  cycles: Cycle[];
  onStatusChange: (v: string) => void;
  onPriorityChange: (v: string) => void;
  onTypeChange: (v: string) => void;
  onPointsChange: (points: number | null) => void;
  onEpicChange: (v: string) => void;
  onModuleChange: (v: string) => void;
  onCycleChange: (v: string) => void;
  disabled?: boolean;
}

const FIELD_GRID = "grid grid-cols-1 gap-3 @[18rem]:grid-cols-2";
const CONTROL_CLASS = "w-full touch-manipulation";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1 block text-micro font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  );
}

export function SidebarSelectFields({
  ticket,
  statuses,
  epics,
  modules,
  cycles,
  onStatusChange,
  onPriorityChange,
  onTypeChange,
  onPointsChange,
  onEpicChange,
  onModuleChange,
  onCycleChange,
  disabled = false,
}: SidebarSelectFieldsProps) {
  const [pointsDraft, setPointsDraft] = useState(
    ticket.points == null ? "" : String(ticket.points),
  );
  const [pointsError, setPointsError] = useState<string | null>(null);

  function commitPoints() {
    const points = parseTicketPointsInput(pointsDraft);
    if (points === undefined) {
      setPointsError(`Must be 0–${MAX_TICKET_POINTS}`);
      setPointsDraft(ticket.points == null ? "" : String(ticket.points));
      return;
    }
    setPointsError(null);
    setPointsDraft(points == null ? "" : String(points));
    if (points !== (ticket.points ?? null)) onPointsChange(points);
  }

  function handlePointsChange(event: React.ChangeEvent<HTMLInputElement>) {
    setPointsError(null);
    setPointsDraft(event.target.value);
  }

  function handlePointsKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") event.currentTarget.blur();
    if (event.key === "Escape") {
      setPointsDraft(ticket.points == null ? "" : String(ticket.points));
      setPointsError(null);
      event.currentTarget.blur();
    }
  }

  return (
    <div className="space-y-3">
      <div className={FIELD_GRID}>
        <div className="min-w-0">
          <FieldLabel>Status</FieldLabel>
          <Select value={ticket.status || "TODO"} onValueChange={onStatusChange} disabled={disabled}>
            <SelectTrigger className={CONTROL_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
              {statuses?.map((s) => (
                <SelectItem key={s.id} value={s.name}>
                  {statusConfig[s.name]?.label ?? s.name.replace(/_/g, " ")}
                </SelectItem>
              )) || (
                <>
                  <SelectItem value="TODO">
                    <span className="flex items-center gap-1.5">
                      <Circle className="h-3 w-3" /> To Do
                    </span>
                  </SelectItem>
                  <SelectItem value="IN_PROGRESS">
                    <span className="flex items-center gap-1.5">
                      <Timer className="h-3 w-3 text-status-info-ink" /> In Progress
                    </span>
                  </SelectItem>
                  <SelectItem value="IN_REVIEW">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="h-3 w-3 text-status-warning-ink" /> In Review
                    </span>
                  </SelectItem>
                  <SelectItem value="DONE">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-status-success-ink" /> Done
                    </span>
                  </SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0">
          <FieldLabel>Priority</FieldLabel>
          <Select value={ticket.priority || "MEDIUM"} onValueChange={onPriorityChange} disabled={disabled}>
            <SelectTrigger className={CONTROL_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className={FIELD_GRID}>
        <div className="min-w-0">
          <FieldLabel>Type</FieldLabel>
          <Select value={ticket.type || "TASK"} onValueChange={onTypeChange} disabled={disabled}>
            <SelectTrigger className={CONTROL_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
              <SelectItem value="TASK">Task</SelectItem>
              <SelectItem value="BUG">Bug</SelectItem>
              <SelectItem value="STORY">Story</SelectItem>
              <SelectItem value="EPIC">Epic</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0">
          <FieldLabel>Points</FieldLabel>
          <Input
            type="number"
            min={0}
            max={MAX_TICKET_POINTS}
            value={pointsDraft}
            onChange={handlePointsChange}
            onBlur={commitPoints}
            onKeyDown={handlePointsKeyDown}
            className={CONTROL_CLASS}
            placeholder="0"
            disabled={disabled}
            aria-invalid={pointsError ? true : undefined}
          />
          {pointsError ? (
            <p className="mt-0.5 text-xs text-status-danger-ink" role="alert">
              {pointsError}
            </p>
          ) : null}
        </div>
      </div>

      <div className={FIELD_GRID}>
        <div className="min-w-0">
          <FieldLabel>
            <Zap className="mr-0.5 inline h-3 w-3" />
            Epic
          </FieldLabel>
          <Select value={ticket.epicId?.toString() || "none"} onValueChange={onEpicChange} disabled={disabled}>
            <SelectTrigger className={CONTROL_CLASS}>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
              <SelectItem value="none">None</SelectItem>
              {epics.map((epic) => (
                <SelectItem key={epic.id} value={epic.id.toString()}>
                  {epic.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0">
          <FieldLabel>
            <Boxes className="mr-0.5 inline h-3 w-3" />
            Workstream
          </FieldLabel>
          <Select value={ticket.moduleId?.toString() || "none"} onValueChange={onModuleChange} disabled={disabled}>
            <SelectTrigger className={CONTROL_CLASS}>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
              <SelectItem value="none">None</SelectItem>
              {modules.map((mod) => (
                <SelectItem key={mod.id} value={mod.id.toString()}>
                  {mod.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-0">
          <FieldLabel>
            <RotateCcw className="mr-0.5 inline h-3 w-3" />
            Cycle
          </FieldLabel>
          <Select value={ticket.cycleId?.toString() || "none"} onValueChange={onCycleChange} disabled={disabled}>
            <SelectTrigger className={CONTROL_CLASS}>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
              <SelectItem value="none">None</SelectItem>
              {cycles.map((cycle) => (
                <SelectItem key={cycle.id} value={cycle.id.toString()}>
                  {cycle.name}
                  {cycle.status === "active" ? " (Active)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
