"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  onPointsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSprintChange: (v: string) => void;
  onEpicChange: (v: string) => void;
  onModuleChange: (v: string) => void;
  onCycleChange: (v: string) => void;
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
}: SidebarSelectFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1 block">
            Status
          </span>
          <Select value={ticket.status || "TODO"} onValueChange={onStatusChange}>
            <SelectTrigger className="h-8 text-xs bg-background w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
                      <Timer className="h-3 w-3 text-blue-500" /> In Progress
                    </span>
                  </SelectItem>
                  <SelectItem value="IN_REVIEW">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="h-3 w-3 text-amber-500" /> In Review
                    </span>
                  </SelectItem>
                  <SelectItem value="DONE">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-green-500" /> Done
                    </span>
                  </SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1 block">
            Priority
          </span>
          <Select value={ticket.priority || "MEDIUM"} onValueChange={onPriorityChange}>
            <SelectTrigger className="h-8 text-xs bg-background w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1 block">
            Type
          </span>
          <Select value={ticket.type || "TASK"} onValueChange={onTypeChange}>
            <SelectTrigger className="h-8 text-xs bg-background w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TASK">Task</SelectItem>
              <SelectItem value="BUG">Bug</SelectItem>
              <SelectItem value="STORY">Story</SelectItem>
              <SelectItem value="EPIC">Epic</SelectItem>
              <SelectItem value="SUBTASK">Subtask</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1 block">
            Points
          </span>
          <Input
            type="number"
            min={0}
            value={ticket.points ?? ""}
            onChange={onPointsChange}
            className="h-8 text-xs bg-background w-full"
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1 block">
            <Target className="h-3 w-3 inline mr-0.5" />
            Sprint
          </span>
          <Select value={ticket.sprintId?.toString() || "none"} onValueChange={onSprintChange}>
            <SelectTrigger className="h-8 text-xs bg-background w-full">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
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
        <div>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1 block">
            <Zap className="h-3 w-3 inline mr-0.5" />
            Epic
          </span>
          <Select value={ticket.epicId?.toString() || "none"} onValueChange={onEpicChange}>
            <SelectTrigger className="h-8 text-xs bg-background w-full">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1 block">
            <Boxes className="h-3 w-3 inline mr-0.5" />
            Module
          </span>
          <Select value={ticket.moduleId?.toString() || "none"} onValueChange={onModuleChange}>
            <SelectTrigger className="h-8 text-xs bg-background w-full">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {modules.map((mod) => (
                <SelectItem key={mod.id} value={mod.id.toString()}>
                  {mod.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-1 block">
            <RotateCcw className="h-3 w-3 inline mr-0.5" />
            Cycle
          </span>
          <Select value={ticket.cycleId?.toString() || "none"} onValueChange={onCycleChange}>
            <SelectTrigger className="h-8 text-xs bg-background w-full">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
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
    </>
  );
}
