"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CopyIcon, ExternalLinkIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useCan } from "@/hooks/api/access";
import { useForm, useUpdateForm } from "@/hooks/api/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { FORM_TYPE_LABELS, FORM_TYPES } from "../field-type-meta";
import { FormFieldEditor } from "../form-field-editor";
import { FormActionsEditor } from "../form-actions-editor";
import type { FormField, FormAction, FormType, UpdateFormInput } from "@/types/projects/forms";

interface FormBuilderTabProps {
  projectId: number;
  formId: number;
}

function getPublicUrl(token: string | null): string | null {
  if (!token) return null;
  if (typeof window === "undefined") return `/forms/${token}`;
  return `${window.location.origin}/forms/${token}`;
}

export function FormBuilderTabSkeleton() {
  return (
    <div className="space-y-4 pt-3">
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-8 w-1/2 rounded" />
        <Skeleton className="h-16 w-full rounded" />
      </div>
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <Skeleton className="h-4 w-16 rounded" />
        <Skeleton className="h-10 w-full rounded" />
        <Skeleton className="h-10 w-full rounded" />
      </div>
    </div>
  );
}

export function FormBuilderTab({ projectId, formId }: FormBuilderTabProps) {
  const canManage = useCan("projects:forms:manage");
  const { data: form, isLoading } = useForm(projectId, formId);
  const updateForm = useUpdateForm(projectId);

  const [name, setName] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [type, setType] = useState<FormType | null>(null);
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [isPublic, setIsPublic] = useState<boolean | null>(null);
  const [fields, setFields] = useState<FormField[] | null>(null);
  const [actions, setActions] = useState<FormAction[] | null>(null);

  if (isLoading || !form) return <FormBuilderTabSkeleton />;

  const effectiveName = name ?? form.name;
  const effectiveDescription = description ?? (form.description ?? "");
  const effectiveType = type ?? form.type;
  const effectiveIsActive = isActive ?? form.isActive;
  const effectiveIsPublic = isPublic ?? form.isPublic;
  const effectiveFields = fields ?? form.fields;
  const effectiveActions = actions ?? form.actions;

  const publicUrl = getPublicUrl(form.publicToken);

  function handleSave() {
    if (!effectiveName.trim()) return;
    const payload: UpdateFormInput = {
      name: effectiveName.trim(),
      description: effectiveDescription.trim() || undefined,
      type: effectiveType,
      fields: effectiveFields,
      actions: effectiveActions,
      isActive: effectiveIsActive,
      isPublic: effectiveIsPublic,
    };
    updateForm.mutate(
      { id: formId, ...payload },
      {
        onSuccess: () => toast.success("Form saved"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleCopyLink() {
    if (!publicUrl) return;
    void navigator.clipboard.writeText(publicUrl).then(() => toast.success("Link copied"));
  }

  function handleOpenPublic() {
    if (!publicUrl) return;
    window.open(publicUrl, "_blank", "noopener,noreferrer");
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setName(e.target.value);
  }

  function handleDescriptionChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setDescription(e.target.value);
  }

  function handleTypeChange(v: string) {
    const found = FORM_TYPES.find((t) => t === v);
    if (found) setType(found);
  }

  function handleActiveChange(v: boolean) {
    setIsActive(v);
  }

  function handlePublicChange(v: boolean) {
    setIsPublic(v);
  }

  const readOnly = !canManage;

  return (
    <div className="space-y-4 pt-3">
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Settings</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">
              Form Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={effectiveName}
              onChange={handleNameChange}
              placeholder="e.g. Bug Report Form"
              className="text-sm"
              readOnly={readOnly}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <Select value={effectiveType} onValueChange={handleTypeChange} disabled={readOnly}>
              <SelectTrigger className="text-sm">
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
            value={effectiveDescription}
            onChange={handleDescriptionChange}
            placeholder="Optional — describe the purpose of this form"
            className="text-sm h-16 resize-none"
            readOnly={readOnly}
          />
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch checked={effectiveIsActive} onCheckedChange={handleActiveChange} disabled={readOnly} />
            <Label className="text-sm">Active</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={effectiveIsPublic} onCheckedChange={handlePublicChange} disabled={readOnly} />
            <Label className="text-sm">Public (shareable link)</Label>
          </div>
        </div>

        {effectiveIsPublic && publicUrl && (
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-xs text-muted-foreground">
            <span className="flex-1 truncate font-mono">{publicUrl}</span>
            <AnimatedIconButton
              type="button"
              variant="ghost"
              size="icon"
              icon={CopyIcon}
              iconSize={14}
              className="h-6 w-6 shrink-0"
              onClick={handleCopyLink}
              aria-label="Copy public link"
            />
            <AnimatedIconButton
              type="button"
              variant="ghost"
              size="icon"
              icon={ExternalLinkIcon}
              iconSize={14}
              className="h-6 w-6 shrink-0"
              onClick={handleOpenPublic}
              aria-label="Open public form"
            />
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fields</p>
        {readOnly ? (
          <p className="text-sm text-muted-foreground">
            {effectiveFields.length} field{effectiveFields.length === 1 ? "" : "s"} configured
          </p>
        ) : (
          <FormFieldEditor fields={effectiveFields} onChange={setFields} />
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions on Submit</p>
        {readOnly ? (
          <p className="text-sm text-muted-foreground">
            {effectiveActions.length} action{effectiveActions.length === 1 ? "" : "s"} configured
          </p>
        ) : (
          <FormActionsEditor actions={effectiveActions} fields={effectiveFields} onChange={setActions} />
        )}
      </div>

      {!readOnly && (
        <>
          <Separator />
          <div className="flex justify-end">
            <LoadingButton
              size="sm"
              onClick={handleSave}
              disabled={!effectiveName.trim()}
              isPending={updateForm.isPending}
              loadingText="Saving…"
            >
              Save Form
            </LoadingButton>
          </div>
        </>
      )}
    </div>
  );
}
