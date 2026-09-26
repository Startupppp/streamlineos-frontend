"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SpaceOption {
  id: number;
  name: string;
  icon: string | null;
}

interface ParentPageOption {
  id: number;
  title: string;
  icon: string | null;
}

interface ImportFormControlsProps {
  spaces: SpaceOption[];
  parentPages: ParentPageOption[];
  targetSpaceId: string;
  targetParentPageId: string;
  visibility: string;
  duplicatePolicy: string;
  onSpaceChange: (value: string) => void;
  onParentPageChange: (value: string) => void;
  onVisibilityChange: (value: string) => void;
  onDuplicatePolicyChange: (value: string) => void;
}

export function ImportFormControls({
  spaces,
  parentPages,
  targetSpaceId,
  targetParentPageId,
  visibility,
  duplicatePolicy,
  onSpaceChange,
  onParentPageChange,
  onVisibilityChange,
  onDuplicatePolicyChange,
}: ImportFormControlsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="space-y-1">
        <Label className="text-xs">Target space</Label>
        <Select value={targetSpaceId} onValueChange={onSpaceChange}>
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="No space" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No space</SelectItem>
            {spaces.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.icon ? `${s.icon} ` : ""}
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Parent page</Label>
        <Select
          value={targetParentPageId}
          onValueChange={onParentPageChange}
          disabled={targetSpaceId === "none"}
        >
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="Top level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Top level</SelectItem>
            {parentPages.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.icon ? `${p.icon} ` : ""}
                {p.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Default visibility</Label>
        <Select value={visibility} onValueChange={onVisibilityChange}>
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="org">Team</SelectItem>
            <SelectItem value="public">Public</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Duplicate items</Label>
        <Select value={duplicatePolicy} onValueChange={onDuplicatePolicyChange}>
          <SelectTrigger className="text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="skip">Skip duplicates</SelectItem>
            <SelectItem value="update">Update duplicates</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
