"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { useCustomStates } from "@/hooks/api/projects/custom-states";
import { useProjectMembers, useProjectLabels } from "@/hooks/api/projects/projects";
import { cn } from "@/lib/utils";
import { getUserDisplayName } from "@/features/projects/shared/resolve-user-name";

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
] as const;

const TICKET_TYPE_OPTIONS = [
  { value: "TASK", label: "Task" },
  { value: "BUG", label: "Bug" },
  { value: "STORY", label: "Story" },
  { value: "EPIC", label: "Epic" },
  { value: "SUBTASK", label: "Subtask" },
] as const;

interface AutomationValueInputProps {
  kind: "action" | "condition";
  discriminant: string;
  value: string;
  onChange: (v: string) => void;
  projectId: number;
  className?: string;
}

function StatusSelect({
  projectId,
  value,
  onChange,
  className,
}: {
  projectId: number;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const { data: states = [] } = useCustomStates(projectId);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select status…" />
      </SelectTrigger>
      <SelectContent>
        {states.map((s) => (
          <SelectItem key={s.id} value={s.name} className="text-sm">
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function AssigneeCombobox({
  projectId,
  value,
  onChange,
  className,
}: {
  projectId: number;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const { data: members = [] } = useProjectMembers(projectId);
  const options = members.map((m) => ({
    value: m.id,
    label: getUserDisplayName(m),
    sublabel: m.email,
  }));
  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder="Select member…"
      searchPlaceholder="Search members…"
      emptyText="No members found."
      className={className}
    />
  );
}

function LabelSelect({
  projectId,
  value,
  onChange,
  className,
}: {
  projectId: number;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const { data: labels = [] } = useProjectLabels(projectId);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select label…" />
      </SelectTrigger>
      <SelectContent>
        {labels.map((l) => (
          <SelectItem key={l.id} value={String(l.id)} className="text-sm">
            {l.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AutomationValueInput({
  kind,
  discriminant,
  value,
  onChange,
  projectId,
  className,
}: AutomationValueInputProps) {
  if (kind === "action") {
    switch (discriminant) {
      case "set_status":
        return (
          <StatusSelect
            projectId={projectId}
            value={value}
            onChange={onChange}
            className={className}
          />
        );
      case "set_assignee":
        return (
          <AssigneeCombobox
            projectId={projectId}
            value={value}
            onChange={onChange}
            className={className}
          />
        );
      case "set_priority":
        return (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className={className}>
              <SelectValue placeholder="Select priority…" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((p) => (
                <SelectItem key={p.value} value={p.value} className="text-sm">
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "add_label":
        return (
          <LabelSelect
            projectId={projectId}
            value={value}
            onChange={onChange}
            className={className}
          />
        );
      case "add_comment":
        return (
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Comment text…"
            className={cn("text-sm min-h-[60px] resize-none", className)}
          />
        );
      default:
        return null;
    }
  }

  switch (discriminant) {
    case "status":
      return (
        <StatusSelect
          projectId={projectId}
          value={value}
          onChange={onChange}
          className={className}
        />
      );
    case "assignee":
      return (
        <AssigneeCombobox
          projectId={projectId}
          value={value}
          onChange={onChange}
          className={className}
        />
      );
    case "priority":
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className={className}>
            <SelectValue placeholder="Select priority…" />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((p) => (
              <SelectItem key={p.value} value={p.value} className="text-sm">
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "label":
      return (
        <LabelSelect
          projectId={projectId}
          value={value}
          onChange={onChange}
          className={className}
        />
      );
    case "type":
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className={className}>
            <SelectValue placeholder="Select type…" />
          </SelectTrigger>
          <SelectContent>
            {TICKET_TYPE_OPTIONS.map((t) => (
              <SelectItem key={t.value} value={t.value} className="text-sm">
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    default:
      return null;
  }
}
