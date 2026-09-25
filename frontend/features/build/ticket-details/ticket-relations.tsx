"use client";

import { useState, useCallback, useMemo } from "react";
import {
  useTicketRelations,
  useAddTicketRelation,
  useRemoveTicketRelation,
  useProjectBoardTickets,
} from "@/hooks/api/build";
import type { WorkItemRelationType } from "@/hooks/api/build";
import { useProject } from "@/hooks/api";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { ErrorState } from "@/components/shared/error-state";
import { Link2, ArrowRight, ArrowLeft, Copy, Minus } from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { PlusIcon, XIcon } from "@animateicons/react/lucide";
import { cn } from "@/lib/utils";
import { SubtaskRow } from "./subtask-row";
import type { ProjectStatusRecord } from "@/types/projects";
import { useCan } from "@/hooks/api/access";

interface TicketRelationsProps {
  ticketId: number;
  projectId: number;
}

const RELATION_TYPES: readonly WorkItemRelationType[] = [
  "blocks",
  "blocked_by",
  "duplicate_of",
  "relates_to",
];

const RELATION_LABELS: Record<WorkItemRelationType, { label: string; icon: React.ReactNode; color: string }> = {
  blocks: {
    label: "Blocks",
    icon: <ArrowRight className="h-3 w-3" />,
    color: "text-destructive",
  },
  blocked_by: {
    label: "Blocked by",
    icon: <ArrowLeft className="h-3 w-3" />,
    color: "text-destructive",
  },
  duplicate_of: {
    label: "Duplicate of",
    icon: <Copy className="h-3 w-3" />,
    color: "text-status-warning-ink-strong",
  },
  relates_to: {
    label: "Relates to",
    icon: <Minus className="h-3 w-3" />,
    color: "text-muted-foreground",
  },
};

function stopProp(e: React.MouseEvent | React.KeyboardEvent) {
  e.preventDefault();
  e.stopPropagation();
}

function RemoveRelationButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  function handleClick(e: React.MouseEvent) {
    stopProp(e);
    onClick();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={stopProp}
      aria-label="Remove relation"
      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0 rounded p-0.5 hover:bg-muted/60"
      {...hoverHandlers}
    >
      <XIcon ref={iconRef} size={12} />
    </button>
  );
}

export function TicketRelations({ ticketId, projectId }: TicketRelationsProps) {
  const canUpdate = useCan("build:tickets:update");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<WorkItemRelationType>("relates_to");
  
  const { data: boardTickets } = useProjectBoardTickets(
    pickerOpen && canUpdate ? projectId : 0,
  );
  const { data: projectData } = useProject(projectId);
  const addRelation = useAddTicketRelation(ticketId, projectId);
  const removeRelation = useRemoveTicketRelation(ticketId, projectId);
  const { data: relations, isLoading, isError, error, refetch } = useTicketRelations(ticketId, projectId);

  const projectKey = projectData?.key ?? null;
  const projectStatuses: ProjectStatusRecord[] = projectData?.statuses ?? [];


  const allTickets = (boardTickets ?? []).filter((t) => t.id !== ticketId);
  const existingRelatedIds = new Set(
    (relations ?? []).map((r) => r.relatedTicket?.id).filter(Boolean)
  );

  const handleAdd = useCallback(() => {
    if (!selectedTicketId) { toast.error("Select a ticket first"); return; }
    addRelation.mutate(
      { relatedTicketId: selectedTicketId, relationType: selectedType },
      {
        onSuccess: () => {
          toast.success("Relation added");
          setSelectedTicketId(null);
          setPickerOpen(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [selectedTicketId, selectedType, addRelation]);

  const handleRemoveRelation = useCallback(
    (relatedTicketId: number) => {
      removeRelation.mutate(relatedTicketId, {
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    },
    [removeRelation]
  );

  const handleTypeChange = (v: string) => {
    const match = RELATION_TYPES.find((t) => t === v);
    if (match) setSelectedType(match);
  };

  const handleRetryRelations = useCallback(() => {
    void refetch();
  }, [refetch]);

  const grouped = useMemo(() => (relations ?? []).reduce<Partial<Record<WorkItemRelationType, typeof relations>>>(
    (acc, r) => {
      const t = r.relationType;
      acc[t] = [...(acc[t] ?? []), r];
      return acc;
    },
    {},
  ), [relations]);

  if (isLoading) return null;

  if (isError) {
    return (
      <ErrorState
        compact
        title="Couldn't load relations"
        description={getErrorMessage(error)}
        onRetry={handleRetryRelations}
      />
    );
  }



  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5" />
          Relations
        </h4>
        {canUpdate ? <ResponsivePopover open={pickerOpen} onOpenChange={setPickerOpen}>
          <ResponsivePopoverTrigger asChild>
            <AnimatedIconButton
              variant="outline"
              size="sm"
              icon={PlusIcon}
              iconSize={12}
              iconClassName="mr-1"
              className="px-2 bg-muted/50 hover:bg-muted"
            >
              Add
            </AnimatedIconButton>
          </ResponsivePopoverTrigger>
          <ResponsivePopoverContent title="Link issue" className="w-80 p-3 space-y-3" align="end">
            <p className="text-xs font-medium">Add Relation</p>
            <Select value={selectedType} onValueChange={handleTypeChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RELATION_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {RELATION_LABELS[t].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Command>
              <CommandInput placeholder="Search tickets..." />
              <CommandList className="max-h-[160px]">
                <CommandEmpty className="py-2 text-xs text-muted-foreground text-center">No tickets found.</CommandEmpty>
                <CommandGroup>
                  {allTickets
                    .filter((t) => !existingRelatedIds.has(t.id))
                    .map((t) => (
                      <CommandItem
                        key={t.id}
                        value={`${t.ticketNumber} ${t.title}`}
                        onSelect={() => setSelectedTicketId(t.id)}
                        className={cn("text-xs", selectedTicketId === t.id && "bg-primary/10")}
                      >
                        <span className="font-mono text-muted-foreground mr-2">#{t.ticketNumber}</span>
                        <span className="truncate">{t.title}</span>
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
            </Command>
            <Button
              size="sm"
              className="w-full text-xs"
              onClick={handleAdd}
              disabled={!selectedTicketId || addRelation.isPending}
            >
              {addRelation.isPending ? "Adding..." : "Add Relation"}
            </Button>
          </ResponsivePopoverContent>
        </ResponsivePopover> : null}
      </div>

      {(relations ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground py-1">No relations yet.</p>
      ) : (
        <div className="space-y-2">
          {RELATION_TYPES.map((type) => {
            const rels = grouped[type];
            const meta = RELATION_LABELS[type];
            if (!rels?.length) return null;
            return (
              <div key={type}>
                <p className={cn("text-micro font-medium flex items-center gap-1 mb-1", meta.color)}>
                  {meta.icon}
                  {meta.label}
                </p>
                <div className="space-y-1">
                  {rels.map((r) => {
                    const t = r.relatedTicket;
                    if (!t) return null;

                    return (
                      <SubtaskRow
                        key={r.id}
                        subtask={{
                          id: t.id,
                          title: t.title,
                          status: t.status ?? "TODO",
                          priority: t.priority,
                          points: t.points,
                          ticketNumber: t.ticketNumber,
                          assigneeId: t.assignee?.id ?? null,
                          projectId: t.projectId ?? projectId,
                          project: t.project,
                          assignee: t.assignee,
                        }}
                        projectId={projectId}
                        projectKey={projectKey}
                        projectStatuses={projectStatuses}
                        endAction={canUpdate ? (
                          <RemoveRelationButton onClick={() => handleRemoveRelation(t.id)} />
                        ) : undefined}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
