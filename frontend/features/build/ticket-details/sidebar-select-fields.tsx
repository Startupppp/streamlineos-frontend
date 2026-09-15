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
  Target,
  Boxes,
  RotateCcw,
} from "lucide-react";
import { parseTicketPointsInput } from "../shared/ticket-points";

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

interface Sprint {
  id: number;
  name: string;
  status?: string | null;
}

interface Status {
  name: string;
  id: number;
}

export interface SidebarSelectFieldsProps {
  ticket: {
    id: number;
    status?: string | null;
    priority?: string | null;
    type?: string | null;
    points?: number | null;
    sprintId?: number | null;
    epicId?: number | null;
    moduleId?: number | null;
    cycleId?: number | null;
  };
  statuses?: Status[];
  sprints: Sprint[];
  epics: Epic[];
  modules: Module[];
  cycles: Cycle[];
  onStatusChange: (v: string) => void;
  onPriorityChange: (v: string) => void;
  onTypeChange: (v: string) => void;
  onPointsChange: (points: number | null) => void;
  onSprintChange: (v: string) => void;
  onEpicChange: (v: string) => void;
  onModuleChange: (v: string) => void;
  onCycleChange: (v: string) => void;
  disabled?: boolean;
}

const FIELD_GRID = "grid grid-cols-1 gap-3 @[18rem]:grid-cols-2";
const CONTROL_CLASS =
  "w-full min-h-10 touch-manipulation @[18rem]:min-h-9 md:min-h-9";

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
  sprints,
  epics,
  modules,
  cycles,
  onStatusChange,
  onPriorityChange,
  onTypeChange,
  onPointsChange,
  onSprintChange,
  onEpicChange,
  onModuleChange,
  onCycleChange,
  disabled = false,
}: SidebarSelectFieldsProps) {
  const [pointsDraft, setPointsDraft] = useState(
    ticket.points == null ? "" : String(ticket.points),
  );

  function commitPoints() {
    const points = parseTicketPointsInput(pointsDraft);
    if (points === undefined) {
      setPointsDraft(ticket.points == null ? "" : String(ticket.points));
      return;
    }
    setPointsDraft(points == null ? "" : String(points));
    if (points !== (ticket.points ?? null)) onPointsChange(points);
  }

  function handlePointsKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") event.currentTarget.blur();
    if (event.key === "Escape") {
      setPointsDraft(ticket.points == null ? "" : String(ticket.points));
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
                  {s.name.replace(/_/g, " ")}
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
            value={pointsDraft}
            onChange={(event) => setPointsDraft(event.target.value)}
            onBlur={commitPoints}
            onKeyDown={handlePointsKeyDown}
            className={CONTROL_CLASS}
            placeholder="0"
            disabled={disabled}
          />
        </div>
      </div>

      <div className={FIELD_GRID}>
        <div className="min-w-0">
          <FieldLabel>
            <Target className="mr-0.5 inline h-3 w-3" />
            Sprint
          </FieldLabel>
          <Select value={ticket.sprintId?.toString() || "none"} onValueChange={onSprintChange} disabled={disabled}>
            <SelectTrigger className={CONTROL_CLASS}>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
              <SelectItem value="none">None</SelectItem>
              {sprints?.map((s) => (
                <SelectItem key={s.id} value={s.id.toString()}>
                  {s.name}
                  {s.status === "ACTIVE" ? " (Active)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
      </div>

      <div className={FIELD_GRID}>
        <div className="min-w-0">
          <FieldLabel>
            <Boxes className="mr-0.5 inline h-3 w-3" />
            Module
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
