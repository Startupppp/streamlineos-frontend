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
import { Sparkles, Plus, Trash2, Info } from "lucide-react";
import type { AutomationAction } from "@/hooks/api/automations";
import type { AiAutomationAction, AiExtractField } from "@/hooks/api/automation-ai-nodes";
import { useSupportTags } from "@/hooks/api/support/tags";

interface FormProps {
  config: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}

function AiBadge() {
  return (
    <Badge variant="secondary" className="gap-1 text-[11px] text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-500/10">
      <Sparkles className="h-3 w-3" /> AI
    </Badge>
  );
}

function toStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.filter((v): v is string => typeof v === "string");
  return [];
}

export function ClassifyNodeForm({ config, onChange }: FormProps) {
  const labels = toStringArray(config.labels);
  const field = typeof config.field === "string" ? config.field : "";

  function handleLabelsChange(raw: string) {
    onChange({ labels: raw.split(",").map((l) => l.trim()).filter(Boolean) });
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
          onChange={(e) => handleLabelsChange(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Payload field to classify *</Label>
        <Input
          aria-label="Payload field to classify"
          placeholder="e.g. subject"
          value={field}
          onChange={(e) => onChange({ field: e.target.value })}
        />
      </div>
    </div>
  );
}

export function SummarizeNodeForm({ config, onChange }: FormProps) {
  const fields = toStringArray(config.fields);

  function handleFieldsChange(raw: string) {
    onChange({ fields: raw.split(",").map((f) => f.trim()).filter(Boolean) });
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
          onChange={(e) => handleFieldsChange(e.target.value)}
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
    onChange({ fields: [...fields, { name: "", description: "", type: "string" }] });
  }

  function handleRemove(idx: number) {
    onChange({ fields: fields.filter((_, i) => i !== idx) });
  }

  function handleFieldPatch(idx: number, patch: Partial<AiExtractField>) {
    onChange({ fields: fields.map((f, i) => (i === idx ? { ...f, ...patch } : f)) });
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
        <p className="text-xs text-muted-foreground">Add at least one field to extract.</p>
      )}
      {fields.map((f, idx) => (
        <div key={idx} className="flex items-start gap-2">
          <div className="flex-1 space-y-1">
            <Input
              placeholder="Field name (e.g. customerName)"
              value={f.name}
              onChange={(e) => handleFieldPatch(idx, { name: e.target.value })}
            />
            <Input
              placeholder="Description for the AI"
              value={f.description}
              onChange={(e) => handleFieldPatch(idx, { description: e.target.value })}
            />
          </div>
          <Select
            value={f.type}
            onValueChange={(v) =>
              handleFieldPatch(idx, { type: v as AiExtractField["type"] })
            }
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="string">String</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="boolean">Boolean</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="w-7 text-destructive hover:text-destructive shrink-0"
            onClick={() => handleRemove(idx)}
            aria-label={`Remove field ${idx + 1}`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      ))}
    </div>
  );
}

export function RoutingSuggestionNodeForm({ config, onChange }: FormProps) {
  const options = toStringArray(config.options);
  const field = typeof config.field === "string" ? config.field : "";

  function handleOptionsChange(raw: string) {
    onChange({ options: raw.split(",").map((o) => o.trim()).filter(Boolean) });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <AiBadge />
        <span className="text-xs text-muted-foreground">Routing suggestion</span>
      </div>
      <div className="flex items-start gap-1.5 rounded-md bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-800 p-2 text-xs text-amber-700 dark:text-amber-300">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          AI Routing Suggestion — generates a suggestion for human review. Never executes automatically.
        </span>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Routing options *</Label>
        <Input
          aria-label="Routing options"
          placeholder="e.g. tier-1-support, billing-team, engineering (comma separated)"
          value={options.join(", ")}
          onChange={(e) => handleOptionsChange(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Payload field for context *</Label>
        <Input
          aria-label="Payload field for context"
          placeholder="e.g. subject"
          value={field}
          onChange={(e) => onChange({ field: e.target.value })}
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
    <Select value={tagId > 0 ? String(tagId) : ""} onValueChange={handleTagChange}>
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
  switch (action.type) {
    case "notify_roles":
      return (
        <div className="space-y-2">
          <Input
            placeholder="Roles (comma separated, e.g. CEO, SALES)"
            value={action.config.roles.join(", ")}
            onChange={(e) =>
              onChange({ roles: e.target.value.split(",").map((r) => r.trim()).filter(Boolean) })
            }
          />
          <Input
            placeholder="Notification title"
            value={action.config.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
          <Textarea
            rows={2}
            placeholder="Notification message"
            value={action.config.message}
            onChange={(e) => onChange({ message: e.target.value })}
          />
          <Input
            placeholder="Link (optional, e.g. /crm/leads)"
            value={action.config.link ?? ""}
            onChange={(e) => onChange({ link: e.target.value })}
          />
        </div>
      );
    case "notify_all":
      return (
        <div className="space-y-2">
          <Input
            placeholder="Notification title"
            value={action.config.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
          <Textarea
            rows={2}
            placeholder="Notification message"
            value={action.config.message}
            onChange={(e) => onChange({ message: e.target.value })}
          />
          <Input
            placeholder="Link (optional)"
            value={action.config.link ?? ""}
            onChange={(e) => onChange({ link: e.target.value })}
          />
        </div>
      );
    case "email":
      return (
        <div className="space-y-2">
          <Input
            type="email"
            placeholder="Recipient email"
            value={action.config.to}
            onChange={(e) => onChange({ to: e.target.value })}
          />
          <Input
            placeholder="Subject"
            value={action.config.subject}
            onChange={(e) => onChange({ subject: e.target.value })}
          />
          <Textarea
            rows={3}
            placeholder="Body (HTML allowed)"
            value={action.config.body}
            onChange={(e) => onChange({ body: e.target.value })}
          />
        </div>
      );
    case "create_task":
      return (
        <div className="space-y-2">
          <Input
            placeholder="Task title"
            value={action.config.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
          <UserCombobox
            value={action.config.assigneeId ?? ""}
            onChange={(assigneeId) => onChange({ assigneeId: assigneeId || undefined })}
            placeholder="Select assignee (optional)…"
            allowUnassigned
          />
          <Input
            type="number"
            min={0}
            placeholder="Due in days (optional)"
            value={action.config.dueInDays === undefined ? "" : String(action.config.dueInDays)}
            onChange={(e) =>
              onChange({ dueInDays: e.target.value === "" ? undefined : Number(e.target.value) })
            }
          />
        </div>
      );
    case "webhook":
      return (
        <Input
          placeholder="Webhook event name (e.g. lead.hot)"
          value={action.config.event}
          onChange={(e) => onChange({ event: e.target.value })}
        />
      );
    case "support_assign_ticket":
      return (
        <UserCombobox
          value={action.config.assigneeId}
          onChange={(assigneeId) => onChange({ assigneeId })}
          placeholder="Select assignee…"
        />
      );
    case "support_set_priority":
      return (
        <Select
          value={action.config.priority}
          onValueChange={(value) => onChange({ priority: value })}
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
      return <SupportTagSelect tagId={action.config.tagId} onChange={onChange} />;
    case "support_internal_note":
      return (
        <Textarea
          rows={2}
          placeholder="Internal note body"
          value={action.config.body}
          onChange={(e) => onChange({ body: e.target.value })}
        />
      );
  }
}
