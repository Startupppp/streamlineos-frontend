"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { ProjectForm, CreateFormInput, UpdateFormInput, FormField, FormAction, FormType } from "@/types/projects/forms";
import { FORM_TYPE_LABELS, FORM_TYPES } from "./field-type-meta";
import { FormFieldEditor } from "./form-field-editor";
import { FormActionsEditor } from "./form-actions-editor";

interface FormBuilderProps {
  form?: ProjectForm;
  onSave: (data: CreateFormInput | UpdateFormInput) => void;
  isPending: boolean;
  readOnly?: boolean;
}

export function FormBuilder({ form, onSave, isPending, readOnly = false }: FormBuilderProps) {
  const [name, setName] = useState(form?.name ?? "");
  const [description, setDescription] = useState(form?.description ?? "");
  const [type, setType] = useState<FormType>(form?.type ?? "generic");
  const [isActive, setIsActive] = useState(form?.isActive ?? true);
  const [isPublic, setIsPublic] = useState(form?.isPublic ?? false);
  const [fields, setFields] = useState<FormField[]>(form?.fields ?? []);
  const [actions, setActions] = useState<FormAction[]>(form?.actions ?? []);

  function handleSave() {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      fields,
      actions,
      isActive,
      isPublic,
    });
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setName(e.target.value);
  }

  function handleDescriptionChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDescription(e.target.value);
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">
            Form Name <span className="text-destructive">*</span>
          </Label>
          <Input
            value={name}
            onChange={handleNameChange}
            placeholder="e.g. Bug Report Form"
            className="h-8 text-sm"
            readOnly={readOnly}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as FormType)} disabled={readOnly}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORM_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{FORM_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Description</Label>
        <Textarea
          value={description}
          onChange={handleDescriptionChange}
          placeholder="Optional — describe the purpose of this form"
          className="text-sm h-16 resize-none"
          readOnly={readOnly}
        />
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch checked={isActive} onCheckedChange={setIsActive} disabled={readOnly} />
          <Label className="text-sm">Active</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={isPublic} onCheckedChange={setIsPublic} disabled={readOnly} />
          <Label className="text-sm">Public (shareable link)</Label>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Fields
        </Label>
        {readOnly ? (
          <p className="text-sm text-muted-foreground">{fields.length} field{fields.length === 1 ? "" : "s"} configured</p>
        ) : (
          <FormFieldEditor fields={fields} onChange={setFields} />
        )}
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Actions on Submit
        </Label>
        {readOnly ? (
          <p className="text-sm text-muted-foreground">{actions.length} action{actions.length === 1 ? "" : "s"} configured</p>
        ) : (
          <FormActionsEditor actions={actions} fields={fields} onChange={setActions} />
        )}
      </div>

      {!readOnly && (
        <div className="flex justify-end pt-2">
          <LoadingButton size="sm" onClick={handleSave} disabled={!name.trim()} isPending={isPending} loadingText="Saving…">
            Save Form
          </LoadingButton>
        </div>
      )}
    </div>
  );
}
