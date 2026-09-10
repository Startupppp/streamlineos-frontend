"use client";

import type { ChangeEvent } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AiExtractField } from "@/hooks/api/automation-ai-nodes";

const EXTRACT_FIELD_TYPES = ["string", "number", "boolean"] as const;

function isExtractFieldType(value: string): value is AiExtractField["type"] {
  return EXTRACT_FIELD_TYPES.some((candidate) => candidate === value);
}

interface AiExtractFieldRowProps {
  field: AiExtractField;
  position: number;
  onPatch: (position: number, patch: Partial<AiExtractField>) => void;
  onRemove: (position: number) => void;
}

export function AiExtractFieldRow({
  field,
  position,
  onPatch,
  onRemove,
}: AiExtractFieldRowProps) {
  function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
    onPatch(position, { name: event.target.value });
  }

  function handleDescriptionChange(event: ChangeEvent<HTMLInputElement>) {
    onPatch(position, { description: event.target.value });
  }

  function handleTypeChange(value: string) {
    if (isExtractFieldType(value)) onPatch(position, { type: value });
  }

  function handleRemove() {
    onRemove(position);
  }

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1 space-y-1">
        <Input
          placeholder="Field name (e.g. customerName)"
          value={field.name}
          onChange={handleNameChange}
        />
        <Input
          placeholder="Description for the AI"
          value={field.description}
          onChange={handleDescriptionChange}
        />
      </div>
      <Select value={field.type} onValueChange={handleTypeChange}>
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
        onClick={handleRemove}
        aria-label={`Remove field ${position + 1}`}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      </Button>
    </div>
  );
}
