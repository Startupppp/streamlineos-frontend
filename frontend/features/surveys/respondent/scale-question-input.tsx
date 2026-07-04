import { Star } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { QuestionInputProps } from "./answer-value";

function NumericScale({ min, max, value, onSelect }: { min: number; max: number; value: number | undefined; onSelect: (n: number) => void }) {
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onSelect(n)}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md border text-sm font-medium transition-colors",
            value === n ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export function RatingInput({ question, value, onChange }: QuestionInputProps) {
  const max = typeof question.settings.max === "number" ? question.settings.max : 5;
  const current = typeof value?.answerValue === "number" ? value.answerValue : undefined;
  return <NumericScale min={1} max={max} value={current} onSelect={(n) => onChange({ answerValue: n })} />;
}

export function NpsInput({ value, onChange }: QuestionInputProps) {
  const current = typeof value?.answerValue === "number" ? value.answerValue : undefined;
  return (
    <div className="space-y-1.5">
      <NumericScale min={0} max={10} value={current} onSelect={(n) => onChange({ answerValue: n })} />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Not likely</span>
        <span>Very likely</span>
      </div>
    </div>
  );
}

export function StarRatingInput({ question, value, onChange }: QuestionInputProps) {
  const max = typeof question.settings.max === "number" ? question.settings.max : 5;
  const current = typeof value?.answerValue === "number" ? value.answerValue : 0;
  const stars = Array.from({ length: max }, (_, i) => i + 1);
  return (
    <div className="flex gap-1">
      {stars.map((n) => (
        <button key={n} type="button" onClick={() => onChange({ answerValue: n })} aria-label={`${n} stars`}>
          <Star className={cn("h-7 w-7", n <= current ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
        </button>
      ))}
    </div>
  );
}

export function SliderInput({ question, value, onChange }: QuestionInputProps) {
  const min = typeof question.settings.min === "number" ? question.settings.min : 0;
  const max = typeof question.settings.max === "number" ? question.settings.max : 100;
  const step = typeof question.settings.step === "number" ? question.settings.step : 1;
  const current = typeof value?.answerValue === "number" ? value.answerValue : Math.round((min + max) / 2);
  return (
    <div className="space-y-3 px-1">
      <Slider min={min} max={max} step={step} value={[current]} onValueChange={([n]) => onChange({ answerValue: n })} />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{min}</span>
        <span className="font-medium text-foreground">{current}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export function LikertInput({ question, value, onChange }: QuestionInputProps) {
  const selected = value?.choiceIds?.[0];
  return (
    <div className="flex flex-wrap justify-between gap-2">
      {question.choices.map((choice) => (
        <button
          key={choice.id}
          type="button"
          onClick={() => onChange({ choiceIds: [choice.id] })}
          className={cn(
            "flex-1 rounded-md border px-2 py-2 text-center text-xs font-medium transition-colors",
            selected === choice.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted",
          )}
        >
          {choice.label}
        </button>
      ))}
    </div>
  );
}
