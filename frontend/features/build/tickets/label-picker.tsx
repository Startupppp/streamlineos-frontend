"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LabelCreateForm } from "@/components/labels";
import { DEFAULT_LABEL_COLOR } from "@/components/labels/label-colors";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { Tag } from "lucide-react";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusIcon, XIcon } from "@animateicons/react/lucide";
import { useProjectLabels } from "@/hooks/api/build/projects";
import {
  useCreateOrgLabel,
  useAddLabelToTicket,
  useRemoveLabelFromTicket,
} from "@/hooks/api/build/tickets";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LabelPickerProps {
  ticketId: number;
  projectId?: number;
  currentLabels: Array<{
    label: { id: number; name: string; color: string | null };
  }>;
}

export function TicketLabelChip({
  label,
  onRemove,
}: {
  label: { id: number; name: string; color: string | null };
  onRemove?: (id: number) => void;
}) {
  return (
    <Badge
      variant="secondary"
      className="h-7 gap-1.5 rounded-full border border-border/70 bg-muted/60 px-2 text-xs font-medium text-foreground shadow-none"
    >
      <span
        aria-hidden="true"
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: label.color || DEFAULT_LABEL_COLOR }}
      />
      <span className="max-w-36 truncate">{label.name}</span>
      {onRemove ? (
        <RemoveLabelButton
          labelId={label.id}
          labelName={label.name}
          onRemove={onRemove}
        />
      ) : null}
    </Badge>
  );
}

function RemoveLabelButton({
  labelId,
  labelName,
  onRemove,
}: {
  labelId: number;
  labelName: string;
  onRemove: (id: number) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button
      type="button"
      onClick={() => onRemove(labelId)}
      aria-label={`Remove ${labelName} label`}
      className="hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
      {...hoverHandlers}
    >
      <XIcon ref={iconRef} size={10} />
    </button>
  );
}

export function LabelPicker({
  ticketId,
  projectId,
  currentLabels,
}: LabelPickerProps) {
  const { iconRef: plusIconRef, hoverHandlers: plusHoverHandlers } =
    useAnimatedIcon();
  const [open, setOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_LABEL_COLOR);

  const { data: allLabels } = useProjectLabels(undefined, { enabled: open });

  const createLabel = useCreateOrgLabel({
    onSuccess: (newLabel) => {
      setNewLabelName("");
      if (projectId !== undefined) {
        addLabel.mutate({ ticketId, projectId, labelId: newLabel.id });
      }
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const addLabel = useAddLabelToTicket({
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const removeLabel = useRemoveLabelFromTicket({
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const currentLabelIds = new Set(currentLabels.map((l) => l.label.id));
  const availableLabels =
    allLabels?.filter((l) => !currentLabelIds.has(l.id)) ?? [];

  const handleRemoveLabel = (labelId: number) => {
    if (projectId === undefined) return;
    removeLabel.mutate({ ticketId, projectId, labelId });
  };

  const handleAddLabel = (labelId: number) => () => {
    if (projectId === undefined) return;
    addLabel.mutate({ ticketId, projectId, labelId });
  };

  const handleCreateLabel = () => {
    if (newLabelName.trim()) {
      createLabel.mutate({ name: newLabelName.trim(), color: selectedColor });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <Tag className="h-3.5 w-3.5" />
        Labels
      </div>
      <div className="flex flex-wrap gap-1.5">
        {currentLabels.map(({ label }) => (
          <TicketLabelChip
            key={label.id}
            label={label}
            onRemove={handleRemoveLabel}
          />
        ))}
        <ResponsivePopover open={open} onOpenChange={setOpen}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <ResponsivePopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Add label"
                    className="text-muted-foreground"
                    {...plusHoverHandlers}
                  >
                    <PlusIcon ref={plusIconRef} size={14} />
                  </Button>
                </ResponsivePopoverTrigger>
              </TooltipTrigger>
              <TooltipContent>Add label</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <ResponsivePopoverContent
            title="Labels"
            className="w-[min(20rem,calc(100vw-2rem))] p-4"
            align="start"
          >
            <div className="space-y-4">
              {availableLabels.length > 0 && (
                <ScrollArea className="max-h-32">
                  <div className="space-y-1">
                    {availableLabels.map((label) => (
                      <button
                        type="button"
                        key={label.id}
                        onClick={handleAddLabel(label.id)}
                        className="flex items-center gap-2 w-full p-1.5 text-sm rounded hover:bg-muted transition-colors text-left"
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              label.color || DEFAULT_LABEL_COLOR,
                          }}
                        />
                        {label.name}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
              <div className="border-t pt-3">
                <LabelCreateForm
                  name={newLabelName}
                  color={selectedColor}
                  onNameChange={setNewLabelName}
                  onColorChange={setSelectedColor}
                  onSubmit={handleCreateLabel}
                  isPending={createLabel.isPending}
                  submitLabel="Create & Add"
                  loadingText="Creating…"
                  showHeading
                />
              </div>
            </div>
          </ResponsivePopoverContent>
        </ResponsivePopover>
      </div>
    </div>
  );
}
