import { Check } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { QuestionInputProps } from "./answer-value";

function ChoiceCard({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3.5 transition-all",
        "hover:border-brand-core/35 hover:bg-muted/40",
        active
          ? "border-brand-core bg-brand-core/5 ring-2 ring-brand-core/15 ring-offset-1"
          : "border-border bg-background",
      )}
    >
      {children}
      {active ? <Check className="ml-auto h-4 w-4 shrink-0 text-brand-core" aria-hidden /> : null}
    </div>
  );
}

export function SingleSelectInput({ question, value, onChange }: QuestionInputProps) {
  const selected = value?.choiceIds?.[0];
  return (
    <RadioGroup
      value={selected ? String(selected) : undefined}
      onValueChange={(v) => onChange({ choiceIds: [Number(v)] })}
      className="gap-2.5"
    >
      {question.choices.map((choice) => {
        const active = selected === choice.id;
        return (
          <ChoiceCard key={choice.id} active={active}>
            <RadioGroupItem value={String(choice.id)} id={`choice-${choice.id}`} />
            <Label htmlFor={`choice-${choice.id}`} className="flex-1 cursor-pointer text-sm font-medium leading-snug">
              {choice.label}
            </Label>
          </ChoiceCard>
        );
      })}
    </RadioGroup>
  );
}

export function MultiSelectInput({ question, value, onChange }: QuestionInputProps) {
  const selected = value?.choiceIds ?? [];

  function toggle(choiceId: number, checked: boolean) {
    const next = checked ? [...selected, choiceId] : selected.filter((id) => id !== choiceId);
    onChange({ choiceIds: next });
  }

  return (
    <div className="space-y-2.5">
      {question.choices.map((choice) => {
        const active = selected.includes(choice.id);
        return (
          <ChoiceCard
            key={choice.id}
            active={active}
            onClick={() => toggle(choice.id, !active)}
          >
            <Checkbox
              id={`choice-${choice.id}`}
              checked={active}
              onCheckedChange={(checked) => toggle(choice.id, checked === true)}
            />
            <Label htmlFor={`choice-${choice.id}`} className="flex-1 cursor-pointer text-sm font-medium leading-snug">
              {choice.label}
            </Label>
          </ChoiceCard>
        );
      })}
    </div>
  );
}

export function DropdownInput({ question, value, onChange }: QuestionInputProps) {
  const selected = value?.choiceIds?.[0];
  return (
    <Select value={selected ? String(selected) : undefined} onValueChange={(v) => onChange({ choiceIds: [Number(v)] })}>
      <SelectTrigger className="h-11 w-full rounded-xl">
        <SelectValue placeholder="Select an option" />
      </SelectTrigger>
      <SelectContent>
        {question.choices.map((choice) => (
          <SelectItem key={choice.id} value={String(choice.id)}>
            {choice.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function YesNoInput({ value, onChange }: QuestionInputProps) {
  const selected = value?.answerValue;
  return (
    <div className="grid grid-cols-2 gap-3">
      {[
        { label: "Yes", val: true },
        { label: "No", val: false },
      ].map((option) => {
        const active = selected === option.val;
        return (
          <button
            key={option.label}
            type="button"
            onClick={() => onChange({ answerValue: option.val })}
            className={cn(
              "h-12 rounded-xl border text-sm font-semibold transition-all",
              "hover:border-brand-core/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-background text-foreground hover:bg-muted/50",
            )}
            aria-pressed={active}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
