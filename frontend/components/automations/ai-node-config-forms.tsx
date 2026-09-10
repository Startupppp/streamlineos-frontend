"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserCombobox } from "@/components/ui/user-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Plus, Info } from "lucide-react";
import { AiExtractFieldRow } from "./ai-extract-field-row";
import type { ChangeEvent } from "react";
import type { AutomationAction } from "@/hooks/api/automations";
import type {
  AiAutomationAction,
  AiExtractField,
} from "@/hooks/api/automation-ai-nodes";
import { useSupportTags } from "@/hooks/api/support/tags";
import { commaListChange, parseCommaList } from "@/lib/comma-list";
import { numericFieldChange } from "@/lib/numeric-field";

type TextFieldEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement>;

interface FormProps {
  config: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}

function AiBadge() {
  return (
    <Badge
      variant="secondary"
      className="gap-1 text-dense text-status-warning-ink border-status-warning-rule bg-status-warning-surface"
    >
      <Sparkles className="h-3 w-3" /> AI
    </Badge>
  );
}

function toStringArray(val: unknown): string[] {
  if (Array.isArray(val))
    return val.filter((v): v is string => typeof v === "string");
  return [];
}

export function ClassifyNodeForm({ config, onChange }: FormProps) {
  const labels = toStringArray(config.labels);
  const field = typeof config.field === "string" ? config.field : "";

  function handleLabelsChange(event: TextFieldEvent) {
    onChange({ labels: parseCommaList(event.target.value) });
  }

  function handleFieldChange(event: TextFieldEvent) {
    onChange({ field: event.target.value });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <AiBadge />
        <span className="text-xs text-muted-foreground">Classify</span>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Classification labels *</Label>
        <Input
          aria-label="Classification labels"
          placeholder="e.g. billing, technical, general (comma separated, min 2)"
          value={labels.join(", ")}
          onChange={handleLabelsChange}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Payload field to classify *</Label>
        <Input
          aria-label="Payload field to classify"
          placeholder="e.g. subject"
          value={field}
          onChange={handleFieldChange}
        />
      </div>
    </div>
  );
}

export function SummarizeNodeForm({ config, onChange }: FormProps) {
  const fields = toStringArray(config.fields);

  function handleFieldsChange(event: TextFieldEvent) {
    onChange({ fields: parseCommaList(event.target.value) });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <AiBadge />
        <span className="text-xs text-muted-foreground">Summarize</span>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Payload fields to summarize *</Label>
        <Input
          aria-label="Payload fields to summarize"
          placeholder="e.g. subject, body, description (comma separated)"
          value={fields.join(", ")}
          onChange={handleFieldsChange}
        />
      </div>
    </div>
  );
}

function isExtractFieldArray(val: unknown): val is AiExtractField[] {
  return (
    Array.isArray(val) &&
    val.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "name" in item &&
        "description" in item &&
        "type" in item,
    )
  );
}

export function ExtractNodeForm({ config, onChange }: FormProps) {
  const fields: AiExtractField[] = isExtractFieldArray(config.fields)
    ? config.fields
    : [];

  function handleAdd() {
    onChange({
      fields: [...fields, { name: "", description: "", type: "string" }],
    });
  }

  function handleRemove(idx: number) {
    onChange({ fields: fields.filter((_, i) => i !== idx) });
  }

  function handleFieldPatch(position: number, patch: Partial<AiExtractField>) {
    onChange({
      fields: fields.map((current, index) =>
        index === position ? { ...current, ...patch } : current,
      ),
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AiBadge />
          <span className="text-xs text-muted-foreground">Extract fields</span>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={handleAdd}>
          <Plus className="h-3 w-3 mr-1" /> Add field
        </Button>
      </div>
      {fields.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Add at least one field to extract.
        </p>
      )}
      {fields.map((extractField, position) => (
        <AiExtractFieldRow
          key={position}
          field={extractField}
          position={position}
          onPatch={handleFieldPatch}
          onRemove={handleRemove}
        />
      ))}
    </div>
  );
}

export function RoutingSuggestionNodeForm({ config, onChange }: FormProps) {
  const options = toStringArray(config.options);
  const field = typeof config.field === "string" ? config.field : "";

  function handleOptionsChange(event: TextFieldEvent) {
    onChange({ options: parseCommaList(event.target.value) });
  }

  function handleFieldChange(event: TextFieldEvent) {
    onChange({ field: event.target.value });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <AiBadge />
        <span className="text-xs text-muted-foreground">
          Routing suggestion
        </span>
      </div>
      <div className="flex items-start gap-1.5 rounded-md bg-status-warning-surface border border-status-warning-rule p-2 text-xs text-status-warning-ink">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          AI Routing Suggestion — generates a suggestion for human review. Never
          executes automatically.
        </span>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Routing options *</Label>
        <Input
          aria-label="Routing options"
          placeholder="e.g. tier-1-support, billing-team, engineering (comma separated)"
          value={options.join(", ")}
          onChange={handleOptionsChange}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Payload field for context *</Label>
        <Input
          aria-label="Payload field for context"
          placeholder="e.g. subject"
          value={field}
          onChange={handleFieldChange}
        />
      </div>
    </div>
  );
}

export function AiActionConfigRenderer({
  action,
  onChange,
}: {
  action: AiAutomationAction;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const cfg = action.config as Record<string, unknown>;
  switch (action.type) {
    case "ai_classify":
      return <ClassifyNodeForm config={cfg} onChange={onChange} />;
    case "ai_summarize":
      return <SummarizeNodeForm config={cfg} onChange={onChange} />;
    case "ai_extract":
      return <ExtractNodeForm config={cfg} onChange={onChange} />;
    case "ai_routing_suggestion":
      return <RoutingSuggestionNodeForm config={cfg} onChange={onChange} />;
  }
}

function SupportTagSelect({
  tagId,
  onChange,
}: {
  tagId: number;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const { data: tags } = useSupportTags();

  function handleTagChange(value: string) {
    onChange({ tagId: Number(value) || 0 });
  }

  return (
    <Select
      value={tagId > 0 ? String(tagId) : ""}
      onValueChange={handleTagChange}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select tag…" />
      </SelectTrigger>
      <SelectContent>
        {(tags ?? []).map((t) => (
          <SelectItem key={t.id} value={String(t.id)}>
            {t.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function StandardActionConfigRenderer({
  action,
  onChange,
}: {
  action: AutomationAction;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  function handleRolesChange(roles: string[]): void {
    onChange({ roles });
  }

  function handleDueInDaysChange(dueInDays: number | undefined): void {
    onChange({ dueInDays });
  }

  function handleTitleChange(event: TextFieldEvent): void {
    onChange({ title: event.target.value });
  }

  function handleMessageChange(event: TextFieldEvent): void {
    onChange({ message: event.target.value });
  }

  function handleLinkChange(event: TextFieldEvent): void {
    onChange({ link: event.target.value });
  }

  function handleToChange(event: TextFieldEvent): void {
    onChange({ to: event.target.value });
  }

  function handleSubjectChange(event: TextFieldEvent): void {
    onChange({ subject: event.target.value });
  }

  function handleBodyChange(event: TextFieldEvent): void {
    onChange({ body: event.target.value });
  }

  function handleEventChange(event: TextFieldEvent): void {
    onChange({ event: event.target.value });
  }

  function handleOptionalAssigneeChange(assigneeId: string): void {
    onChange({ assigneeId: assigneeId || undefined });
  }

  function handleAssigneeChange(assigneeId: string): void {
    onChange({ assigneeId });
  }

  function handlePriorityChange(priority: string): void {
    onChange({ priority });
  }

  switch (action.type) {
    case "notify_roles":
      return (
        <div className="space-y-2">
          <Input
            placeholder="Roles (comma separated, e.g. CEO, SALES)"
            value={action.config.roles.join(", ")}
            onChange={commaListChange(handleRolesChange)}
          />
          <Input
            placeholder="Notification title"
            value={action.config.title}
            onChange={handleTitleChange}
          />
          <Textarea
            rows={2}
            placeholder="Notification message"
            value={action.config.message}
            onChange={handleMessageChange}
          />
          <Input
            placeholder="Link (optional, e.g. /crm/leads)"
            value={action.config.link ?? ""}
            onChange={handleLinkChange}
          />
        </div>
      );
    case "notify_all":
      return (
        <div className="space-y-2">
          <Input
            placeholder="Notification title"
            value={action.config.title}
            onChange={handleTitleChange}
          />
          <Textarea
            rows={2}
            placeholder="Notification message"
            value={action.config.message}
            onChange={handleMessageChange}
          />
          <Input
            placeholder="Link (optional)"
            value={action.config.link ?? ""}
            onChange={handleLinkChange}
          />
        </div>
      );
    case "email":
      return (
        <div className="space-y-2">
          <Input
            type="email"
            placeholder="Recipient email"
            value={
              Array.isArray(action.config.to)
                ? action.config.to.join(", ")
                : action.config.to
            }
            onChange={handleToChange}
          />
          <Input
            placeholder="Subject"
            value={action.config.subject}
            onChange={handleSubjectChange}
          />
          <Textarea
            rows={3}
            placeholder="Body (HTML allowed)"
            value={action.config.body}
            onChange={handleBodyChange}
          />
        </div>
      );
    case "create_task":
      return (
        <div className="space-y-2">
          <Input
            placeholder="Task title"
            value={action.config.title}
            onChange={handleTitleChange}
          />
          <UserCombobox
            value={action.config.assigneeId ?? ""}
            onChange={handleOptionalAssigneeChange}
            placeholder="Select assignee (optional)…"
            allowUnassigned
          />
          <Input
            type="number"
            min={0}
            placeholder="Due in days (optional)"
            value={
              action.config.dueInDays === undefined
                ? ""
                : String(action.config.dueInDays)
            }
            onChange={numericFieldChange(handleDueInDaysChange)}
          />
        </div>
      );
    case "webhook":
      return (
        <Input
          placeholder="Webhook event name (e.g. lead.hot)"
          value={action.config.event}
          onChange={handleEventChange}
        />
      );
    case "support_assign_ticket":
      return (
        <UserCombobox
          value={action.config.assigneeId}
          onChange={handleAssigneeChange}
          placeholder="Select assignee…"
        />
      );
    case "support_set_priority":
      return (
        <Select
          value={action.config.priority}
          onValueChange={handlePriorityChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
          </SelectContent>
        </Select>
      );
    case "support_add_tag":
      return (
        <SupportTagSelect tagId={action.config.tagId} onChange={onChange} />
      );
    case "support_internal_note":
      return (
        <Textarea
          rows={2}
          placeholder="Internal note body"
          value={action.config.body}
          onChange={handleBodyChange}
        />
      );
  }
}
