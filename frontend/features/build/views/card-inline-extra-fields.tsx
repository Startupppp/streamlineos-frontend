"use client";

import { useState, memo } from "react";
import { useSourceOverride } from "@/hooks/common/use-source-override";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { cn } from "@/lib/utils";
import { INLINE_POPOVER_MIN_CLASS } from "@/components/ui/field-control";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateTicket, useAddLabelToTicket, useRemoveLabelFromTicket } from "@/hooks/api/build/tickets";
import { useProjectLabels } from "@/hooks/api/build/projects";
import { useModules } from "@/hooks/api/build/modules";
import { popoverOptionBaseClass, popoverOptionSelectedClass } from "../shared/popover-option-classes";
import { LabelsSearchCommand } from "../shared/labels-search-command";
import { InlineFieldWrapper } from "./card-field-wrapper";
import { Boxes, Check, Tag } from "lucide-react";
import type { TicketLabel } from "@/types/projects";
import { resolveLabelColor } from "@/components/labels/label-colors";

interface InlineLabelsProps {
  ticketId: number;
  projectId: number;
  currentLabelIds?: number[];
}

export const InlineLabels = memo(function InlineLabels({
  ticketId,
  projectId,
  currentLabelIds = [],
}: InlineLabelsProps) {
  const [open, setOpen] = useState(false);
  const { data: labels = [] } = useProjectLabels(projectId);
  const currentIdsKey = currentLabelIds.join(",");
  const [selectedIds, setOptimisticIds] = useSourceOverride(currentIdsKey, currentLabelIds);
  const selectedLabels = labels.filter((label) => selectedIds.includes(label.id));

  const addLabel = useAddLabelToTicket({
    onError: (e) => {
      setOptimisticIds(currentLabelIds);
      toast.error(getErrorMessage(e));
    },
  });
  const removeLabel = useRemoveLabelFromTicket({
    onError: (e) => {
      setOptimisticIds(currentLabelIds);
      toast.error(getErrorMessage(e));
    },
  });

  function handleLabelToggle(labelId: number) {
    const next = selectedIds.includes(labelId)
      ? selectedIds.filter((id) => id !== labelId)
      : [...selectedIds, labelId];
    setOptimisticIds(next);
    if (selectedIds.includes(labelId)) {
      removeLabel.mutate({ ticketId, projectId, labelId });
    } else {
      addLabel.mutate({ ticketId, projectId, labelId });
    }
  }

  function handleLabelCreated(label: TicketLabel) {
    if (selectedIds.includes(label.id)) return;
    setOptimisticIds([...selectedIds, label.id]);
    addLabel.mutate({ ticketId, projectId, labelId: label.id });
  }

  return (
    <InlineFieldWrapper>
      <ResponsivePopover open={open} onOpenChange={setOpen}>
        <ResponsivePopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex max-w-full items-center gap-1 rounded p-0.5 hover:bg-muted/60 transition-colors"
            aria-label="Edit labels"
          >
            {selectedLabels.length > 0 ? (
              <span className="flex min-w-0 flex-wrap items-center gap-1">
                {selectedLabels.slice(0, 2).map((label) => (
                  <span
                    key={label.id}
                    className="max-w-[7.5rem] truncate rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground"
                    style={{
                      backgroundColor: `${resolveLabelColor(label.color)}1a`,
                      color: resolveLabelColor(label.color),
                    }}
                  >
                    {label.name}
                  </span>
                ))}
                {selectedLabels.length > 2 ? (
                  <span className="text-xs text-muted-foreground">
                    +{selectedLabels.length - 2}
                  </span>
                ) : null}
              </span>
            ) : (
              <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
          </button>
        </ResponsivePopoverTrigger>
        <ResponsivePopoverContent title="Labels" className={cn("p-1", INLINE_POPOVER_MIN_CLASS, "min-w-48")} align="start">
          <LabelsSearchCommand
            labels={labels}
            selectedIds={selectedIds}
            onToggle={handleLabelToggle}
            onCreated={handleLabelCreated}
            open={open}
          />
        </ResponsivePopoverContent>
      </ResponsivePopover>
    </InlineFieldWrapper>
  );
});

interface InlineModuleProps {
  ticketId: number;
  projectId: number;
  version: number;
  currentModuleId?: number | null;
  hideEmpty?: boolean;
}

export const InlineModule = memo(function InlineModule({
  ticketId,
  projectId,
  version,
  currentModuleId,
  hideEmpty = false,
}: InlineModuleProps) {
  const [open, setOpen] = useState(false);
  const { data: modules = [] } = useModules(projectId);
  const updateTicket = useUpdateTicket(projectId, {
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const currentModule = modules.find((module) => module.id === currentModuleId);

  if (hideEmpty && currentModuleId == null) {
    return null;
  }

  function makeModuleHandler(moduleId: number | null) {
    return function selectModule() {
      updateTicket.mutate({ ticketId, version, moduleId });
      setOpen(false);
    };
  }

  return (
    <InlineFieldWrapper>
      <ResponsivePopover open={open} onOpenChange={setOpen}>
        <ResponsivePopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex max-w-full items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-muted/60"
            aria-label="Change module"
          >
            <Boxes
              className={cn(
                "h-3 w-3 shrink-0",
                currentModule ? "text-foreground" : "text-muted-foreground",
              )}
            />
            <span
              className={cn(
                "max-w-[7.5rem] truncate text-micro",
                currentModule ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {currentModule?.name ?? "No module"}
            </span>
          </button>
        </ResponsivePopoverTrigger>
        <ResponsivePopoverContent
          title="Module"
          className={cn("p-1", INLINE_POPOVER_MIN_CLASS, "min-w-44")}
          align="start"
        >
          <button
            type="button"
            onClick={makeModuleHandler(null)}
            className={cn(
              popoverOptionBaseClass,
              currentModuleId == null && popoverOptionSelectedClass,
            )}
          >
            <Boxes className="h-3 w-3 shrink-0 text-muted-foreground" />
            No module
            {currentModuleId == null ? <Check className="ml-auto h-3 w-3" /> : null}
          </button>
          {modules.map((module) => (
            <button
              key={module.id}
              type="button"
              onClick={makeModuleHandler(module.id)}
              className={cn(
                popoverOptionBaseClass,
                currentModuleId === module.id && popoverOptionSelectedClass,
              )}
            >
              <Boxes className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{module.name}</span>
              {currentModuleId === module.id ? (
                <Check className="ml-auto h-3 w-3 shrink-0" />
              ) : null}
            </button>
          ))}
        </ResponsivePopoverContent>
      </ResponsivePopover>
    </InlineFieldWrapper>
  );
});
