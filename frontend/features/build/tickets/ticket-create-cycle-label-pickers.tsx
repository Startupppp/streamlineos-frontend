"use client";

import { useState, forwardRef } from "react";
import { Check, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { popoverOptionBaseClass, popoverOptionSelectedClass } from "../shared/popover-option-classes";
import { LabelsSearchCommand } from "../shared/labels-search-command";
import type { Cycle, TicketLabel } from "@/types/projects";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { XIcon } from "@animateicons/react/lucide";

const PillButton = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button"> & { label: string }
>(function PillButton({ children, className, label, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted/80",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});

function RemoveLabelChipButton({
  labelId,
  labelName,
  onRemove,
}: {
  labelId: number;
  labelName: string;
  onRemove: (id: number) => () => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button
      type="button"
      onClick={onRemove(labelId)}
      aria-label={`Remove ${labelName}`}
      className="inline-flex size-3 shrink-0 items-center justify-center leading-none hover:text-destructive transition-colors"
      {...hoverHandlers}
    >
      <XIcon ref={iconRef} size={10} className="shrink-0" />
    </button>
  );
}

interface TicketCycleLabelPickersProps {
  labelIds: number[];
  labels: TicketLabel[];
  cycleId: number | null;
  cycles: Cycle[];
  onChange: (patch: { labelIds?: number[]; cycleId?: number | null }) => void;
}

export function TicketCycleLabelPickers({
  labelIds,
  labels,
  cycleId,
  cycles,
  onChange,
}: TicketCycleLabelPickersProps) {
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [cycleOpen, setCycleOpen] = useState(false);

  const selectedLabels = labels.filter((l) => labelIds.includes(l.id));
  const selectedCycle = cycleId != null ? cycles.find((c) => c.id === cycleId) : null;

  const labelsPillText =
    selectedLabels.length === 0
      ? null
      : selectedLabels.length === 1
        ? selectedLabels[0]?.name
        : `${selectedLabels[0]?.name} +${selectedLabels.length - 1}`;

  function handleLabelToggle(id: number) {
    const next = labelIds.includes(id)
      ? labelIds.filter((l) => l !== id)
      : [...labelIds, id];
    onChange({ labelIds: next });
  }

  function makeLabelRemoveHandler(id: number) {
    return function removeLabelChip() {
      handleLabelToggle(id);
    };
  }

  function handleLabelCreated(label: TicketLabel) {
    if (labelIds.includes(label.id)) return;
    onChange({ labelIds: [...labelIds, label.id] });
  }

  function makeCycleHandler(id: number | null) {
    return function selectCycle() {
      onChange({ cycleId: id });
      setCycleOpen(false);
    };
  }

  return (
    <>
      <ResponsivePopover open={labelsOpen} onOpenChange={setLabelsOpen} modal>
        <ResponsivePopoverTrigger asChild>
          <PillButton label="Set labels">
            <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {labelsPillText ? (
              <span className="inline-block max-w-[120px] truncate" title={labelsPillText}>{labelsPillText}</span>
            ) : (
              <span className="text-muted-foreground">Labels</span>
            )}
          </PillButton>
        </ResponsivePopoverTrigger>
        <ResponsivePopoverContent title="Labels" className="z-[110] w-48 p-1" align="start">
          <LabelsSearchCommand
            labels={labels}
            selectedIds={labelIds}
            onToggle={handleLabelToggle}
            onCreated={handleLabelCreated}
            open={labelsOpen}
          />
        </ResponsivePopoverContent>
      </ResponsivePopover>

      <ResponsivePopover open={cycleOpen} onOpenChange={setCycleOpen} modal>
        <ResponsivePopoverTrigger asChild>
          <PillButton label="Set cycle">
            <span className="h-3 w-3 shrink-0 rounded-full border-2 border-current opacity-70" />
            {selectedCycle ? (
              <span className="inline-block max-w-[120px] truncate" title={selectedCycle.name}>{selectedCycle.name}</span>
            ) : (
              <span className="text-muted-foreground">Cycle</span>
            )}
          </PillButton>
        </ResponsivePopoverTrigger>
        <ResponsivePopoverContent title="Cycle" className="z-[110] w-56 p-1" align="start">
          <button
            type="button"
            onClick={makeCycleHandler(null)}
            className={cn(
              popoverOptionBaseClass,
              "text-muted-foreground",
              cycleId === null && popoverOptionSelectedClass,
            )}
          >
            No cycle
            {cycleId === null && <Check className="ml-auto h-3 w-3" />}
          </button>
          {cycles.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={makeCycleHandler(c.id)}
              className={cn(
                popoverOptionBaseClass,
                cycleId === c.id && popoverOptionSelectedClass,
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  c.status === "active" ? "bg-status-success-fill" : c.status === "completed" ? "bg-muted-foreground" : "bg-status-info-fill",
                )}
              />
              <span className="min-w-0 flex-1 truncate text-left">{c.name}</span>
              {c.status === "active" && (
                <Badge variant="outline" className="h-4 px-1 text-micro text-status-success-ink-strong border-status-success-rule">Active</Badge>
              )}
              {cycleId === c.id && <Check className="ml-auto h-3 w-3" />}
            </button>
          ))}
        </ResponsivePopoverContent>
      </ResponsivePopover>

      {selectedLabels.length > 0 && (
        <div className="flex w-full flex-wrap gap-1">
          {selectedLabels.map((label) => (
            <Badge
              key={label.id}
              variant="secondary"
              className="h-5 gap-1 px-1.5 text-micro leading-none"
              style={{ borderLeft: `2px solid ${label.color}` }}
            >
              <span className="leading-none">{label.name}</span>
              <RemoveLabelChipButton labelId={label.id} labelName={label.name} onRemove={makeLabelRemoveHandler} />
            </Badge>
          ))}
        </div>
      )}
    </>
  );
}
