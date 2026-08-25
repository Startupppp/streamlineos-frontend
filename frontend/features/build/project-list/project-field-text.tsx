"use client";

import { useState, memo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateProject } from "@/hooks/api/build";
import { TEXT_ONE_LINE, TEXT_TWO_LINES } from "@/lib/text-overflow";
import { InlineFieldWrapper } from "@/features/build/views/card-inline-fields";

interface InlineProjectFieldProps {
  projectId: number;
}

interface InlineProjectTitleProps extends InlineProjectFieldProps {
  currentName: string;
}

export const InlineProjectTitle = memo(function InlineProjectTitle({
  projectId,
  currentName,
}: InlineProjectTitleProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentName);
  const updateProject = useUpdateProject({
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function handleOpen(next: boolean) {
    if (next) setValue(currentName);
    setOpen(next);
  }

  function handleSave() {
    const trimmed = value.trim();
    if (trimmed.length < 2 || trimmed === currentName) {
      setOpen(false);
      return;
    }
    updateProject.mutate(
      { projectId, name: trimmed },
      { onSuccess: () => setOpen(false) },
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") setOpen(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value);
  }

  return (
    <InlineFieldWrapper>
      <Popover open={open} onOpenChange={handleOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "w-full text-left text-label font-semibold text-foreground transition-colors hover:text-primary",
              TEXT_ONE_LINE,
            )}
            aria-label="Edit project name"
            title={currentName}
          >
            {currentName}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <Input
            autoFocus
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="text-sm"
            placeholder="Project name"
          />
          <LoadingButton
            size="sm"
            className="mt-2 w-full"
            isPending={updateProject.isPending}
            loadingText="Saving…"
            onClick={handleSave}
            disabled={value.trim().length < 2}
          >
            Save
          </LoadingButton>
        </PopoverContent>
      </Popover>
    </InlineFieldWrapper>
  );
});

interface InlineProjectDescriptionProps extends InlineProjectFieldProps {
  currentDescription: string | null;
}

export const InlineProjectDescription = memo(function InlineProjectDescription({
  projectId,
  currentDescription,
}: InlineProjectDescriptionProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentDescription ?? "");
  const updateProject = useUpdateProject({
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function handleOpen(next: boolean) {
    if (next) setValue(currentDescription ?? "");
    setOpen(next);
  }

  function handleSave() {
    const trimmed = value.trim();
    if (trimmed === (currentDescription ?? "")) {
      setOpen(false);
      return;
    }
    updateProject.mutate(
      { projectId, description: trimmed || undefined },
      { onSuccess: () => setOpen(false) },
    );
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
  }

  const preview = currentDescription?.trim();

  return (
    <InlineFieldWrapper>
      <Popover open={open} onOpenChange={handleOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              TEXT_TWO_LINES,
              "mt-1 flex-1 text-left text-micro transition-colors",
              preview
                ? "text-muted-foreground hover:text-foreground"
                : "text-muted-foreground/50 hover:text-muted-foreground",
            )}
            aria-label="Edit project description"
            title={preview || undefined}
          >
            {preview || "Add description…"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <Textarea
            autoFocus
            value={value}
            onChange={handleChange}
            placeholder="What is this project about?"
            className="min-h-[72px] resize-none text-xs"
            rows={3}
          />
          <LoadingButton
            size="sm"
            className="mt-2 w-full"
            isPending={updateProject.isPending}
            loadingText="Saving…"
            onClick={handleSave}
          >
            Save
          </LoadingButton>
        </PopoverContent>
      </Popover>
    </InlineFieldWrapper>
  );
});
