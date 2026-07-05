import type { Value as PhoneValue } from "react-phone-number-input";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { DatePicker } from "@/components/ui/date-picker";
import type { QuestionInputProps } from "./answer-value";

const fieldClass = "h-11 rounded-xl text-sm";

export function ShortTextInput({ value, onChange }: QuestionInputProps) {
  return (
    <Input
      className={fieldClass}
      value={value?.answerText ?? ""}
      onChange={(e) => onChange({ answerText: e.target.value })}
      placeholder="Type your answer"
    />
  );
}

export function LongTextInput({ value, onChange }: QuestionInputProps) {
  return (
    <Textarea
      rows={5}
      className="min-h-[120px] rounded-xl text-sm resize-y"
      value={value?.answerText ?? ""}
      onChange={(e) => onChange({ answerText: e.target.value })}
      placeholder="Type your answer"
    />
  );
}

export function NumberInput({ value, onChange }: QuestionInputProps) {
  return (
    <Input
      type="number"
      className={fieldClass}
      value={typeof value?.answerValue === "number" ? value.answerValue : ""}
      onChange={(e) =>
        onChange({ answerValue: e.target.value === "" ? undefined : Number(e.target.value) })
      }
      placeholder="Enter a number"
    />
  );
}

export function EmailInput({ value, onChange }: QuestionInputProps) {
  return (
    <Input
      type="email"
      className={fieldClass}
      value={value?.answerText ?? ""}
      onChange={(e) => onChange({ answerText: e.target.value })}
      placeholder="you@example.com"
    />
  );
}

export function PhoneQuestionInput({ value, onChange }: QuestionInputProps) {
  return (
    <PhoneInput
      value={(value?.answerText ?? "") as PhoneValue}
      onChange={(v) => onChange({ answerText: String(v ?? "") })}
    />
  );
}

export function DateInput({ value, onChange }: QuestionInputProps) {
  return <DatePicker value={value?.answerText} onChange={(v) => onChange({ answerText: v })} />;
}

export function ConsentInput({ question, value, onChange }: QuestionInputProps) {
  const checked = value?.answerValue === true;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/20 px-4 py-4">
      <Checkbox
        id={`consent-${question.id}`}
        checked={checked}
        onCheckedChange={(v) => onChange({ answerValue: v === true })}
      />
      <Label htmlFor={`consent-${question.id}`} className="text-sm font-normal leading-relaxed">
        {question.description || question.title}
      </Label>
    </div>
  );
}

export function ContentBlockDisplay({ question }: QuestionInputProps) {
  if (!question.description) return null;
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-4 text-sm leading-relaxed text-muted-foreground">
      {question.description}
    </div>
  );
}
