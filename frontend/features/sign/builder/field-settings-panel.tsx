"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDeleteSignField, useUpdateSignField } from "@/hooks/api/sign/fields";
import type { SignField } from "@/types/sign";
import { fieldTypeMeta } from "./field-types";
import { useBuilder } from "./builder-context";

export function FieldSettingsPanel({ envelopeId, field }: { envelopeId: number; field: SignField }) {
  const updateField = useUpdateSignField(envelopeId);
  const deleteField = useDeleteSignField(envelopeId);
  const { setSelectedFieldId } = useBuilder();
  const [optionsText, setOptionsText] = useState((field.optionsJson ?? []).join("\n"));
  const meta = fieldTypeMeta(field.fieldType);
  const needsOptions = field.fieldType === "dropdown" || field.fieldType === "radio";

  async function handleToggleRequired(required: boolean) {
    try {
      await updateField.mutateAsync({ id: field.id, input: { required } });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleLabelBlur(e: React.FocusEvent<HTMLInputElement>) {
    const label = e.target.value.trim();
    if (label === (field.label ?? "")) return;
    try {
      await updateField.mutateAsync({ id: field.id, input: { label } });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleOptionsBlur() {
    const options = optionsText
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);
    try {
      await updateField.mutateAsync({ id: field.id, input: { optionsJson: options } });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleDelete() {
    try {
      await deleteField.mutateAsync(field.id);
      setSelectedFieldId(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium">{meta.label} field</p>

      <div className="space-y-1.5">
        <Label htmlFor="field-label">Label</Label>
        <Input id="field-label" defaultValue={field.label ?? ""} placeholder={meta.label} onBlur={handleLabelBlur} />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="field-required">Required</Label>
        <Switch id="field-required" checked={field.required} onCheckedChange={handleToggleRequired} disabled={field.fieldType === "date_signed"} />
      </div>

      {needsOptions && (
        <div className="space-y-1.5">
          <Label htmlFor="field-options">Options (one per line)</Label>
          <textarea
            id="field-options"
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-24"
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            onBlur={handleOptionsBlur}
          />
        </div>
      )}

      <Button variant="destructive" size="sm" className="w-full" onClick={handleDelete}>
        <Trash2 className="size-4" />
        Delete field
      </Button>
    </div>
  );
}
