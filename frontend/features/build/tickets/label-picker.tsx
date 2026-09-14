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
import {
  useLabels,
  useCreateOrgLabel,
  useAddLabelToTicket,
  useRemoveLabelFromTicket,
} from "@/hooks/api";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

interface LabelPickerProps {
  ticketId: number;
  projectId?: number;
  currentLabels: Array<{
    label: { id: number; name: string; color: string | null };
  }>;
}

function RemoveLabelButton({ labelId, labelName, onRemove }: { labelId: number; labelName: string; onRemove: (id: number) => () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button
      onClick={onRemove(labelId)}
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
  const { iconRef: plusIconRef, hoverHandlers: plusHoverHandlers } = useAnimatedIcon();
  const [open, setOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_LABEL_COLOR);
  const queryClient = useQueryClient();

  const { data: allLabels } = useLabels();

  const createLabel = useCreateOrgLabel({
    onSuccess: (newLabel) => {
      setNewLabelName("");
      queryClient.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.labels() });
      if (projectId !== undefined) {
        addLabel.mutate({ ticketId, projectId, labelId: newLabel.id });
      }
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const addLabel = useAddLabelToTicket({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.ticket(ticketId),
      });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const removeLabel = useRemoveLabelFromTicket({
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.ticket(ticketId),
      });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const currentLabelIds = new Set(currentLabels.map((l) => l.label.id));
  const availableLabels =
    allLabels?.filter((l) => !currentLabelIds.has(l.id)) ?? [];

  const handleRemoveLabel = (labelId: number) => () => {
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
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <Tag className="h-3.5 w-3.5" />
        Labels
      </div>
      <div className="flex flex-wrap gap-1.5">
        {currentLabels.map(({ label }) => (
          <Badge
            key={label.id}
            variant="secondary"
            className="gap-1 pl-1.5 pr-1 py-0.5 text-xs cursor-default"
            style={{ borderLeft: `3px solid ${label.color || "#3b82f6"}` }}
          >
            {label.name}
            <RemoveLabelButton labelId={label.id} labelName={label.name} onRemove={handleRemoveLabel} />
          </Badge>
        ))}
        <ResponsivePopover open={open} onOpenChange={setOpen}>
          <ResponsivePopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Add label"
              className="h-9 w-9 touch-manipulation rounded-full p-0 sm:h-7 sm:w-7"
              {...plusHoverHandlers}
            >
              <PlusIcon ref={plusIconRef} size={14} />
            </Button>
          </ResponsivePopoverTrigger>
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
                        key={label.id}
                        onClick={handleAddLabel(label.id)}
                        className="flex items-center gap-2 w-full p-1.5 text-sm rounded hover:bg-muted transition-colors text-left"
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: label.color || "#3b82f6" }}
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
