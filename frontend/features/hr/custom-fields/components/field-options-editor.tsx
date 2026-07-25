"use client";

import { type UseFormReturn, type FieldArrayWithId, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusIcon, XIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { type FieldFormValues } from "../lib/custom-field-form";

function RemoveOptionButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="w-7 text-muted-foreground hover:text-destructive shrink-0"
      onClick={onClick}
      aria-label="Remove option"
      {...hoverHandlers}
    >
      <XIcon ref={iconRef} size={14} />
    </Button>
  );
}

interface FieldOptionsEditorProps {
  form: UseFormReturn<FieldFormValues>;
  optionFields: FieldArrayWithId<FieldFormValues, "options", "id">[];
  onAppend: (value: { label: string; value: string }) => void;
  onRemove: (index: number) => void;
}

export function FieldOptionsEditor({
  form,
  optionFields,
  onAppend,
  onRemove,
}: FieldOptionsEditorProps) {
  const { iconRef: addOptionIconRef, hoverHandlers: addOptionHoverHandlers } = useAnimatedIcon();

  const handleOptionLabelChange = (idx: number, label: string) => {
    const slug = label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    form.setValue(`options.${idx}.value`, slug);
  };

  const handleAddOption = () => {
    onAppend({ label: "", value: "" });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">Options *</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 text-xs px-2 gap-1"
          onClick={handleAddOption}
          {...addOptionHoverHandlers}
        >
          <PlusIcon ref={addOptionIconRef} size={12} /> Add Option
        </Button>
      </div>
      {optionFields.length === 0 && (
        <p className="text-xs text-muted-foreground">No options yet. Add at least one.</p>
      )}
      {optionFields.map((optField, idx) => (
        <div key={optField.id} className="flex gap-2 items-start">
          <div className="flex-1 space-y-1">
            <Input
              {...form.register(`options.${idx}.label`)}
              className="text-xs"
              placeholder="Label"
              onChange={(e) => {
                form.register(`options.${idx}.label`).onChange(e);
                handleOptionLabelChange(idx, e.target.value);
              }}
            />
            {form.formState.errors.options?.[idx]?.label && (
              <p className="text-[10px] text-destructive">
                {form.formState.errors.options[idx]?.label?.message}
              </p>
            )}
          </div>
          <div className="flex-1 space-y-1">
            <Input
              {...form.register(`options.${idx}.value`)}
              className="text-xs font-mono"
              placeholder="value"
            />
            {form.formState.errors.options?.[idx]?.value && (
              <p className="text-[10px] text-destructive">
                {form.formState.errors.options[idx]?.value?.message}
              </p>
            )}
          </div>
          <RemoveOptionButton onClick={() => onRemove(idx)} />
        </div>
      ))}
    </div>
  );
}
