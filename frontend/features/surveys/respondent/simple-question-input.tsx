import type { Value as PhoneValue } from "react-phone-number-input";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { DatePicker } from "@/components/ui/date-picker";
import type { QuestionInputProps } from "./answer-value";

export function ShortTextInput({ value, onChange }: QuestionInputProps) {
  return <Input value={value?.answerText ?? ""} onChange={(e) => onChange({ answerText: e.target.value })} />;
}

export function LongTextInput({ value, onChange }: QuestionInputProps) {
  return <Textarea rows={4} value={value?.answerText ?? ""} onChange={(e) => onChange({ answerText: e.target.value })} />;
}

export function NumberInput({ value, onChange }: QuestionInputProps) {
  return (
    <Input
      type="number"
      value={typeof value?.answerValue === "number" ? value.answerValue : ""}
      onChange={(e) => onChange({ answerValue: e.target.value === "" ? undefined : Number(e.target.value) })}
    />
  );
}

export function EmailInput({ value, onChange }: QuestionInputProps) {
  return <Input type="email" value={value?.answerText ?? ""} onChange={(e) => onChange({ answerText: e.target.value })} placeholder="you@example.com" />;
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
    <div className="flex items-start gap-2">
      <Checkbox id={`consent-${question.id}`} checked={checked} onCheckedChange={(v) => onChange({ answerValue: v === true })} />
      <Label htmlFor={`consent-${question.id}`} className="font-normal leading-snug">{question.description || question.title}</Label>
    </div>
  );
}

export function ContentBlockDisplay() {
  return null;
}
