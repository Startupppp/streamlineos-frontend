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
                  <CommandItem key={role} value={role} onSelect={() => onSelect(role)}>
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === role ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {role}
                  </CommandItem>
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

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Question</label>
        <Textarea
          placeholder="e.g. Tell me about a time you handled a conflict..."
          value={form.question}
          onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
          rows={4}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Category</label>
          <Select
            value={form.category}
            onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
            onValueChange={(v) =>
              setForm((f) => ({ ...f, difficulty: v as "EASY" | "MEDIUM" | "HARD" }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
          onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Sample Answer{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Textarea
          placeholder="Describe what an ideal answer would include..."
          value={form.sampleAnswer}
          onChange={(e) => setForm((f) => ({ ...f, sampleAnswer: e.target.value }))}
          rows={4}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">
          Required Keywords{" "}
          <span className="text-muted-foreground font-normal">(comma-separated)</span>
        </label>
        <Input
          placeholder="e.g. ownership, collaboration, metrics"
          value={form.keywords}
          onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
        />
      </div>
    </div>
  );
}
