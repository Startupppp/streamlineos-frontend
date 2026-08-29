import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { TicketPriority } from "@/hooks/api/support/macros";
import { useSupportTags } from "@/hooks/api/support/tags";
import type { SupportTicketStatus } from "@/types/support";
import {
  NONE_VALUE,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
} from "./macro-constants";

interface MacroActionFieldsProps {
  status: SupportTicketStatus | typeof NONE_VALUE;
  priority: TicketPriority | typeof NONE_VALUE;
  tagId: string;
  isInternal: boolean;
  onStatusChange: (value: string) => void;
  onPriorityChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onInternalChange: (value: boolean) => void;
}

export function MacroActionFields({
  status,
  priority,
  tagId,
  isInternal,
  onStatusChange,
  onPriorityChange,
  onTagChange,
  onInternalChange,
}: MacroActionFieldsProps) {
  const { data: tags } = useSupportTags();
  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <p className="text-xs font-medium text-foreground">Actions on apply</p>
      <div className="grid grid-cols-2 gap-3">
        <MacroActionSelect
          id="macro-set-status"
          label="Set status"
          value={status}
          onValueChange={onStatusChange}
          options={STATUS_OPTIONS.map((value) => ({
            value,
            label: value.replace("_", " "),
          }))}
        />
        <MacroActionSelect
          id="macro-set-priority"
          label="Set priority"
          value={priority}
          onValueChange={onPriorityChange}
          options={PRIORITY_OPTIONS.map((value) => ({ value, label: value }))}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="macro-add-tag" className="text-xs">
          Add tag
        </Label>
        <Select value={tagId} onValueChange={onTagChange}>
          <SelectTrigger id="macro-add-tag" size="sm">
            <SelectValue placeholder="No tag" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>No tag</SelectItem>
            {(tags ?? []).map((tag) => (
              <SelectItem key={tag.id} value={String(tag.id)}>
                {tag.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="macro-action-internal"
          checked={isInternal}
          onCheckedChange={onInternalChange}
        />
        <Label
          htmlFor="macro-action-internal"
          className="cursor-pointer text-xs"
        >
          Post as internal note when applied
        </Label>
      </div>
    </div>
  );
}

function MacroActionSelect({
  id,
  label,
  value,
  onValueChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id} size="sm">
          <SelectValue placeholder="No change" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>No change</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
