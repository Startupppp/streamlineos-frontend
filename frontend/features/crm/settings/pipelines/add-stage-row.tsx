"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";

import { CrmColorPicker } from "@/features/crm/settings/shared/crm-color-picker";
import { useCreateStage } from "@/hooks/api/crm";
import { getErrorMessage } from "@/lib/get-error-message";
import { slugify } from "./pipeline-constants";

export function AddStageRow({
  pipelineId,
  stagesCount,
}: {
  pipelineId: string;
  stagesCount: number;
}) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("blue");
  const createStage = useCreateStage();

  const handleLabelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLabel(e.target.value);
  }, []);

  const handleAdd = useCallback(() => {
    const trimmed = label.trim();
    if (!trimmed) return;
    createStage.mutate(
      {
        pipelineId,
        label: trimmed,
        key: slugify(trimmed),
        color,
        sortOrder: stagesCount,
        description: null,
        probability: 50,
        stageType: "open",
        isTerminal: false,
        slaHours: null,
        requiresApproval: false,
        requiredFields: [],
        allowedNextStageKeys: null,
        isActive: true,
        icon: null,
      },
      {
        onSuccess: () => { setLabel(""); setColor("blue"); toast.success("Stage added"); },
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }, [createStage, pipelineId, label, color, stagesCount]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); handleAdd(); }
  }, [handleAdd]);

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-dashed border-border">
      <CrmColorPicker value={color} onChange={setColor} />
      <Input
        value={label}
        onChange={handleLabelChange}
        onKeyDown={handleKeyDown}
        placeholder="Stage name…"
        className="h-8 text-xs flex-1"
      />
      <LoadingButton
        type="button"
        size="sm"
        className="h-7 text-xs px-2.5"
        isPending={createStage.isPending}
        loadingText="Adding..."
        onClick={handleAdd}
        disabled={!label.trim()}
      >
        <Plus className="h-3 w-3 mr-1" />
        Add
      </LoadingButton>
    </div>
  );
}
