"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import {
  RecordForm,
  type RecordFieldControl,
  type RecordFormValues,
} from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { useCreateBlueprint, useCrmMetadata } from "@/hooks/api/crm";
import { getErrorMessage } from "@/lib/get-error-message";
import { BLUEPRINT_LAYOUT } from "@/lib/renderer/crm/settings/blueprint-layout";
import { flagOr, requiredText, textOrNull } from "../shared/record-payload";

/**
 * Create a blueprint, rendered from the description.
 *
 * A dialog rather than a sheet, and correctly: three fields, one decision,
 * nothing to lose by pressing Escape. The overlay ladder says take the lowest
 * rung that fits, and this fits.
 *
 * The pipeline picker is supplied through `controls` because which pipelines
 * exist is the tenant's business, not the blueprint's shape.
 */

interface CreateBlueprintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}

export function CreateBlueprintDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateBlueprintDialogProps) {
  const layout = useTenantLayout(BLUEPRINT_LAYOUT);
  const { data: metadata } = useCrmMetadata();
  const createBlueprint = useCreateBlueprint();

  const pipelines = useMemo(() => metadata?.pipelines ?? [], [metadata]);

  const controls = useMemo(
    () => ({
      pipelineId: (control: RecordFieldControl) => (
        <Select
          value={control.value}
          onValueChange={control.onChange}
          disabled={control.disabled}
        >
          <SelectTrigger aria-label="Pipeline">
            <SelectValue placeholder="Choose a pipeline" />
          </SelectTrigger>
          <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
            {pipelines.map((pipeline) => (
              <SelectItem key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    }),
    [pipelines],
  );

  function handleClose() {
    onOpenChange(false);
  }

  function handleSubmit(values: RecordFormValues) {
    createBlueprint.mutate(
      {
        name: requiredText(values, "name"),
        description: textOrNull(values, "description") ?? null,
        pipelineId: requiredText(values, "pipelineId"),
        isActive: flagOr(values, "isActive", true),
      },
      {
        onSuccess: (created) => {
          toast.success("Blueprint created");
          onOpenChange(false);
          onCreated(created.id);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New blueprint</DialogTitle>
          <DialogDescription>
            A blueprint decides which stage may follow which, on one pipeline.
          </DialogDescription>
        </DialogHeader>

        <RecordForm
          key={open ? "open" : "closed"}
          layout={layout}
          mode="create"
          initial={{ isActive: "true" }}
          controls={controls}
          onSubmit={handleSubmit}
          onCancel={handleClose}
          isSubmitting={createBlueprint.isPending}
          submitLabel="Create blueprint"
        />
      </DialogContent>
    </Dialog>
  );
}
