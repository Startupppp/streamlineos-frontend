"use client";

import { useCallback } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { QuestionFormState } from "./question-form-dialog";

export const CATEGORIES = [
  "GENERAL",
  "TECHNICAL",
  "BEHAVIOURAL",
  "SITUATIONAL",
  "ROLE_SPECIFIC",
  "CULTURE_FIT",
];
export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"];
export const QUESTION_MAX_LENGTH = 300;
export const SAMPLE_ANSWER_MAX_LENGTH = 200;
export const TAGS_MAX_COUNT = 5;
export const KEYWORDS_MAX_COUNT = 5;

export function countCommaSeparatedItems(value: string): number {
  return value.split(",").map((t) => t.trim()).filter(Boolean).length;
}

function clampCommaSeparatedInput(value: string, max: number): string {
  const parts = value.split(",");
  const out: string[] = [];
  let itemCount = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const trimmed = part.trim();
    const isLast = i === parts.length - 1;

    if (trimmed && !isLast) {
      if (itemCount >= max) break;
      itemCount++;
      out.push(part);
    } else if (isLast) {
      if (itemCount >= max && trimmed) break;
      out.push(part);
    } else {
      out.push(part);
    }
  }

  return out.join(",");
}

interface RolePickerProps {
  value: string;
  roleInput: string;
  options: string[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (role: string) => void;
  onInputChange: (v: string) => void;
  onUseCustom: () => void;
}

export function RolePicker({
  value,
  roleInput,
  options,
  open,
  onOpenChange,
  onSelect,
  onInputChange,
  onUseCustom,
}: RolePickerProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value || "Select or type a role..."}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search or enter a role..."
            value={roleInput}
            onValueChange={onInputChange}
          />
          <CommandList>
            <CommandEmpty>
              {roleInput.trim() ? (
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                  onClick={onUseCustom}
                >
                  Use &quot;{roleInput.trim()}&quot;
                </button>
              ) : (
                <p className="py-2 text-center text-sm text-muted-foreground">
                  No roles found. Type to add.
                </p>
              )}
            </CommandEmpty>
            {options.length > 0 && (
              <CommandGroup heading="Roles">
                {options.map((role) => (
                  <RoleOption key={role} role={role} isSelected={value === role} onSelect={onSelect} />
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface QuestionFormBodyProps {
  form: QuestionFormState;
  setForm: React.Dispatch<React.SetStateAction<QuestionFormState>>;
  roleOptions: string[];
  rolePickerOpen: boolean;
  onRolePickerOpenChange: (v: boolean) => void;
}

function RoleOption({ role, isSelected, onSelect }: { role: string; isSelected: boolean; onSelect: (role: string) => void }) {
  function handleSelect() { onSelect(role); }
  return (
    <CommandItem value={role} onSelect={handleSelect}>
      <Check
        className={cn(
          "mr-2 h-4 w-4",
          isSelected ? "opacity-100" : "opacity-0"
        )}
      />
      {role}
    </CommandItem>
  );
}

export function QuestionFormBody({
  form,
  setForm,
  roleOptions,
  rolePickerOpen,
  onRolePickerOpenChange,
}: QuestionFormBodyProps) {
  const handleRoleSelect = useCallback(
    (role: string) => {
      setForm((f) => ({ ...f, role, roleInput: "" }));
      onRolePickerOpenChange(false);
    },
    [setForm, onRolePickerOpenChange]
  );

  const handleRoleInputChange = useCallback(
    (v: string) => {
      setForm((f) => ({ ...f, roleInput: v }));
    },
    [setForm]
  );

  const handleUseCustomRole = useCallback(() => {
    setForm((f) => ({ ...f, role: f.roleInput.trim(), roleInput: "" }));
    onRolePickerOpenChange(false);
  }, [setForm, onRolePickerOpenChange]);

  const handleQuestionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value.slice(0, QUESTION_MAX_LENGTH);
      setForm((f) => ({ ...f, question: value }));
    },
    [setForm]
  );

  const questionLength = form.question.length;

  const handleSampleAnswerChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value.slice(0, SAMPLE_ANSWER_MAX_LENGTH);
      setForm((f) => ({ ...f, sampleAnswer: value }));
    },
    [setForm]
  );

  const sampleAnswerLength = form.sampleAnswer.length;

  const handleTagsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = clampCommaSeparatedInput(e.target.value, TAGS_MAX_COUNT);
      setForm((f) => ({ ...f, tags: value }));
    },
    [setForm]
  );

  const tagsCount = countCommaSeparatedItems(form.tags);

  const handleKeywordsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = clampCommaSeparatedInput(e.target.value, KEYWORDS_MAX_COUNT);
      setForm((f) => ({ ...f, keywords: value }));
    },
    [setForm]
  );

  const keywordsCount = countCommaSeparatedItems(form.keywords);

  const handleCategoryChange = useCallback(
    (v: string) => {
      setForm((f) => ({ ...f, category: v }));
    },
    [setForm]
  );

  const handleDifficultyChange = useCallback(
    (v: string) => {
      setForm((f) => ({ ...f, difficulty: v as "EASY" | "MEDIUM" | "HARD" }));
    },
    [setForm]
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Question</label>
        <Textarea
          placeholder="e.g. Tell me about a time you handled a conflict..."
          value={form.question}
          onChange={handleQuestionChange}
          rows={4}
          maxLength={QUESTION_MAX_LENGTH}
          aria-describedby="question-char-count"
        />
        <p
          id="question-char-count"
          className={cn(
            "text-[10px] text-right tabular-nums",
            questionLength >= QUESTION_MAX_LENGTH
              ? "text-destructive"
              : questionLength >= QUESTION_MAX_LENGTH - 30
                ? "text-amber-600"
                : "text-muted-foreground"
          )}
        >
          {questionLength}/{QUESTION_MAX_LENGTH} characters
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Category</label>
          <Select
            value={form.category}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Difficulty</label>
          <Select
            value={form.difficulty}
            onValueChange={handleDifficultyChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
              {DIFFICULTIES.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">
          For Role <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <RolePicker
          value={form.role}
          roleInput={form.roleInput}
          options={roleOptions}
          open={rolePickerOpen}
          onOpenChange={onRolePickerOpenChange}
          onSelect={handleRoleSelect}
          onInputChange={handleRoleInputChange}
          onUseCustom={handleUseCustomRole}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Tags <span className="text-muted-foreground font-normal">(comma-separated)</span>
        </label>
        <Input
          placeholder="e.g. leadership, problem-solving"
          value={form.tags}
          onChange={handleTagsChange}
          aria-describedby="tags-count"
        />
        <p
          id="tags-count"
          className={cn(
            "text-[10px] text-right tabular-nums",
            tagsCount >= TAGS_MAX_COUNT
              ? "text-destructive"
              : tagsCount >= TAGS_MAX_COUNT - 1
                ? "text-amber-600"
                : "text-muted-foreground"
          )}
        >
          {tagsCount}/{TAGS_MAX_COUNT} tags
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Sample Answer{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Textarea
          placeholder="Describe what an ideal answer would include..."
          value={form.sampleAnswer}
          onChange={handleSampleAnswerChange}
          rows={4}
          maxLength={SAMPLE_ANSWER_MAX_LENGTH}
          aria-describedby="sample-answer-char-count"
        />
        <p
          id="sample-answer-char-count"
          className={cn(
            "text-[10px] text-right tabular-nums",
            sampleAnswerLength >= SAMPLE_ANSWER_MAX_LENGTH
              ? "text-destructive"
              : sampleAnswerLength >= SAMPLE_ANSWER_MAX_LENGTH - 20
                ? "text-amber-600"
                : "text-muted-foreground"
          )}
        >
          {sampleAnswerLength}/{SAMPLE_ANSWER_MAX_LENGTH} characters
        </p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Required Keywords{" "}
          <span className="text-muted-foreground font-normal">(comma-separated)</span>
        </label>
        <Input
          placeholder="e.g. ownership, collaboration, metrics"
          value={form.keywords}
          onChange={handleKeywordsChange}
          aria-describedby="keywords-count"
        />
        <p
          id="keywords-count"
          className={cn(
            "text-[10px] text-right tabular-nums",
            keywordsCount >= KEYWORDS_MAX_COUNT
              ? "text-destructive"
              : keywordsCount >= KEYWORDS_MAX_COUNT - 1
                ? "text-amber-600"
                : "text-muted-foreground"
          )}
        >
          {keywordsCount}/{KEYWORDS_MAX_COUNT} keywords
        </p>
      </div>
    </div>
  );
}
