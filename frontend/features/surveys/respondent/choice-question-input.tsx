import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { QuestionInputProps } from "./answer-value";

export function SingleSelectInput({ question, value, onChange }: QuestionInputProps) {
  const selected = value?.choiceIds?.[0];
  return (
    <RadioGroup
      value={selected ? String(selected) : undefined}
      onValueChange={(v) => onChange({ choiceIds: [Number(v)] })}
      className="gap-2"
    >
      {question.choices.map((choice) => (
        <div key={choice.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 has-[[data-state=checked]]:border-primary">
          <RadioGroupItem value={String(choice.id)} id={`choice-${choice.id}`} />
          <Label htmlFor={`choice-${choice.id}`} className="flex-1 cursor-pointer font-normal">{choice.label}</Label>
        </div>
      ))}
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
    <div className="space-y-2">
      {question.choices.map((choice) => (
        <div key={choice.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 has-[[data-state=checked]]:border-primary">
          <Checkbox
            id={`choice-${choice.id}`}
            checked={selected.includes(choice.id)}
            onCheckedChange={(checked) => toggle(choice.id, checked === true)}
          />
          <Label htmlFor={`choice-${choice.id}`} className="flex-1 cursor-pointer font-normal">{choice.label}</Label>
        </div>
      ))}
    </div>
  );
}

export function DropdownInput({ question, value, onChange }: QuestionInputProps) {
  const selected = value?.choiceIds?.[0];
  return (
    <Select value={selected ? String(selected) : undefined} onValueChange={(v) => onChange({ choiceIds: [Number(v)] })}>
      <SelectTrigger className="w-full"><SelectValue placeholder="Select an option" /></SelectTrigger>
      <SelectContent>
        {question.choices.map((choice) => (
          <SelectItem key={choice.id} value={String(choice.id)}>{choice.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function YesNoInput({ value, onChange }: QuestionInputProps) {
  const selected = value?.answerValue;
  return (
    <div className="flex gap-2">
      {[{ label: "Yes", val: true }, { label: "No", val: false }].map((option) => (
        <button
          key={option.label}
          type="button"
          onClick={() => onChange({ answerValue: option.val })}
          className={`flex-1 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
            selected === option.val ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
