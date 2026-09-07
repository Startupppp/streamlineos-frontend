"use client";

import { useState, useCallback } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

import {
  useCrmOptions,
  useCreateBlueprintTransition,
  useUpdateBlueprintTransition,
  useDeleteBlueprintTransition,
} from "@/hooks/api/crm";
import type { CrmBlueprintTransition, CrmPipelineStage } from "@/types/crm/metadata";
import { getErrorMessage } from "@/lib/get-error-message";
import type { CreateTransitionInput } from "@/hooks/api/crm/metadata";

export interface TransitionPopoverProps {
  fromStage: CrmPipelineStage;
  toStage: CrmPipelineStage;
  transition: CrmBlueprintTransition | undefined;
  blueprintId: string;
  onClose: () => void;
}

export function TransitionPopover({
  fromStage,
  toStage,
  transition,
  blueprintId,
  onClose,
}: TransitionPopoverProps) {
  const [requiredFields, setRequiredFields] = useState<string[]>(
    transition?.requiredFields ?? []
  );
  const [fieldInput, setFieldInput] = useState("");
  const [requiredActivityTypeKeys, setRequiredActivityTypeKeys] = useState<string[]>(
    transition?.requiredActivityTypeKeys ?? []
  );
  const [requiresApproval, setRequiresApproval] = useState(
    transition?.requiresApproval ?? false
  );
  const [requiresQuote, setRequiresQuote] = useState(
    transition?.requiresQuote ?? false
  );

  const { data: activityTypes = [] } = useCrmOptions("activity_type");
  const createTransition = useCreateBlueprintTransition(blueprintId);
  const updateTransition = useUpdateBlueprintTransition(blueprintId);
  const deleteTransition = useDeleteBlueprintTransition(blueprintId);

  const handleFieldKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const val = fieldInput.trim();
        if (val && !requiredFields.includes(val)) {
          setRequiredFields((prev) => [...prev, val]);
        }
        setFieldInput("");
      }
    },
    [fieldInput, requiredFields]
  );

  const handleRemoveField = useCallback((field: string) => {
    setRequiredFields((prev) => prev.filter((f) => f !== field));
  }, []);

  const handleFieldInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setFieldInput(e.target.value),
    []
  );

  const handleToggleActivityType = useCallback((key: string, checked: boolean) => {
    setRequiredActivityTypeKeys((prev) =>
      checked ? [...prev, key] : prev.filter((k) => k !== key)
    );
  }, []);

  const handleSave = useCallback(() => {
    const payload: CreateTransitionInput = {
      fromStageKey: fromStage.key,
      toStageKey: toStage.key,
      requiredFields,
      requiredActivityTypeKeys,
      requiresApproval,
      requiresQuote,
    };
    if (transition) {
      updateTransition.mutate(
        { id: transition.id, ...payload },
        {
          onSuccess: () => { toast.success("Transition updated"); onClose(); },
          onError: (err) => toast.error(getErrorMessage(err)),
        }
      );
    } else {
      createTransition.mutate(payload, {
        onSuccess: () => { toast.success("Transition configured"); onClose(); },
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    }
  }, [
    transition, fromStage.key, toStage.key, requiredFields,
    requiredActivityTypeKeys, requiresApproval, requiresQuote,
    createTransition, updateTransition, onClose,
  ]);

  const handleDelete = useCallback(() => {
    if (!transition) return;
    deleteTransition.mutate(transition.id, {
      onSuccess: () => { toast.success("Transition removed"); onClose(); },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [transition, deleteTransition, onClose]);

  const isSaving = createTransition.isPending || updateTransition.isPending;

  return (
    <div className="w-72 space-y-3 p-1">
      <div className="text-dense font-semibold text-foreground">
        {fromStage.label} → {toStage.label}
      </div>
      <Separator />

      <div>
        <div className="text-micro font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
          Required Fields
        </div>
        <div className="flex flex-wrap gap-1 mb-1.5">
          {requiredFields.map((f) => (
            <span
              key={f}
              className="inline-flex items-center gap-0.5 bg-muted text-muted-foreground text-micro px-1.5 h-5 rounded"
            >
              {f}
              <button type="button" onClick={() => handleRemoveField(f)} className="ml-0.5 hover:text-destructive">
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
        <Input
          value={fieldInput}
          onChange={handleFieldInputChange}
          onKeyDown={handleFieldKeyDown}
          placeholder="field_name → Enter"
          className="text-xs"
        />
      </div>

      {activityTypes.length > 0 && (
        <div>
          <div className="text-micro font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
            Required Activity Types
          </div>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {activityTypes.map((at) => (
              <label key={at.key} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={requiredActivityTypeKeys.includes(at.key)}
                  onCheckedChange={(checked) =>
                    handleToggleActivityType(at.key, checked === true)
                  }
                  className="h-3.5 w-3.5"
                />
                <span className="text-xs">{at.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs">Requires Approval</span>
          <Switch
            checked={requiresApproval}
            onCheckedChange={setRequiresApproval}
            className="scale-75"
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs">Requires Quote</span>
          <Switch
            checked={requiresQuote}
            onCheckedChange={setRequiresQuote}
            className="scale-75"
          />
        </div>
        {transition && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Auto Tasks</span>
            <Badge variant="outline" className="text-micro h-4 px-1.5">
              {(transition.autoTaskTemplates ?? []).length} task{(transition.autoTaskTemplates ?? []).length !== 1 ? "s" : ""}
            </Badge>
          </div>
        )}
      </div>

      <Separator />
      <div className="flex items-center gap-2">
        <LoadingButton
          size="sm"
          className="text-xs flex-1"
          onClick={handleSave}
          isPending={isSaving}
          loadingText="Saving…"
        >
          Save
        </LoadingButton>
        {transition && (
          <LoadingButton
            size="sm"
            variant="destructive"
            className="text-xs"
            onClick={handleDelete}
            isPending={deleteTransition.isPending}
            loadingText="…"
          >
            Remove
          </LoadingButton>
        )}
      </div>
    </div>
  );
}
