import { Star } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { QuestionInputProps } from "./answer-value";

const CSAT_LABELS_5: Record<number, string> = {
  1: "Very dissatisfied",
  2: "Dissatisfied",
  3: "Neutral",
  4: "Satisfied",
  5: "Very satisfied",
};

function satisfactionTone(value: number, max: number): string {
  const ratio = (value - 1) / Math.max(max - 1, 1);
  if (ratio <= 0.25) return "border-status-danger-rule bg-status-danger-surface text-status-danger-ink ring-status-danger-rule";
  if (ratio <= 0.5) return "border-status-warning-rule bg-status-warning-surface text-status-warning-ink ring-status-warning-rule";
  if (ratio <= 0.75) return "border-status-info-rule bg-status-info-surface text-status-info-ink ring-status-info-rule";
  return "border-status-success-rule bg-status-success-surface text-status-success-ink ring-status-success-rule";
}

function NumericScale({
  min,
  max,
  value,
  onSelect,
  showEndpointLabels = false,
  showValueLabels = false,
}: {
  min: number;
  max: number;
  value: number | undefined;
  onSelect: (n: number) => void;
  showEndpointLabels?: boolean;
  showValueLabels?: boolean;
}) {
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const cols = options.length <= 6 ? options.length : 6;

  return (
    <div className="space-y-3">
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${Math.min(cols, options.length)}, minmax(0, 1fr))` }}
      >
        {options.map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onSelect(n)}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center rounded-xl border px-1 py-2.5 text-sm font-semibold transition-all",
                "hover:border-primary/40 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? cn("ring-2 ring-offset-1", satisfactionTone(n, max))
                  : "border-border bg-background text-foreground",
              )}
              aria-pressed={selected}
            >
              <span className="text-base tabular-nums">{n}</span>
              {showValueLabels && max <= 5 && CSAT_LABELS_5[n] ? (
                <span className="mt-0.5 hidden text-micro font-medium leading-tight text-current/80 sm:block">
                  {CSAT_LABELS_5[n]}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {showEndpointLabels ? (
        <div className="flex justify-between gap-4 text-xs text-muted-foreground">
          <span>{min === 0 ? "Not at all likely" : "Lowest"}</span>
          <span>{max === 10 ? "Extremely likely" : "Highest"}</span>
        </div>
      ) : max <= 5 ? (
        <div className="flex justify-between gap-4 text-xs text-muted-foreground sm:hidden">
          <span>Very dissatisfied</span>
          <span>Very satisfied</span>
        </div>
      ) : null}
      {value !== undefined && max <= 5 && CSAT_LABELS_5[value] ? (
        <p className="text-center text-sm font-medium text-foreground">{CSAT_LABELS_5[value]}</p>
      ) : null}
    </div>
  );
}

export function RatingInput({ question, value, onChange }: QuestionInputProps) {
  const max = typeof question.settings.max === "number" ? question.settings.max : 5;
  const current = typeof value?.answerValue === "number" ? value.answerValue : undefined;
  return (
    <NumericScale
      min={1}
      max={max}
      value={current}
      onSelect={(n) => onChange({ answerValue: n })}
      showValueLabels={max <= 5}
    />
  );
}

export function NpsInput({ value, onChange }: QuestionInputProps) {
  const current = typeof value?.answerValue === "number" ? value.answerValue : undefined;

  function npsTone(n: number, selected: boolean): string {
    if (!selected) return "border-border bg-background hover:bg-muted/60";
    if (n <= 6) return "border-status-danger-rule bg-status-danger-surface text-status-danger-ink ring-2 ring-status-danger-rule ring-offset-1";
    if (n <= 8) return "border-status-warning-rule bg-status-warning-surface text-status-warning-ink ring-2 ring-status-warning-rule ring-offset-1";
    return "border-status-success-rule bg-status-success-surface text-status-success-ink ring-2 ring-status-success-rule ring-offset-1";
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-11 gap-1.5 sm:gap-2">
        {Array.from({ length: 11 }, (_, i) => i).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange({ answerValue: n })}
            className={cn(
              "flex h-10 sm:h-11 items-center justify-center rounded-lg border text-xs sm:text-sm font-semibold tabular-nums transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              npsTone(n, current === n),
            )}
            aria-pressed={current === n}
          >
            {n}
          </button>
        ))}
      </div>
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
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {stars.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange({ answerValue: n })}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            className="rounded-lg p-1 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star
              className={cn(
                "h-9 w-9",
                n <= current ? "fill-amber-400 text-status-warning-ink" : "text-muted-foreground",
              )}
            />
          </button>
        ))}
      </div>
      {current > 0 ? (
        <p className="text-sm text-muted-foreground">
          {current} of {max} star{max === 1 ? "" : "s"}
        </p>
      ) : null}
    </div>
  );
}

export function SliderInput({ question, value, onChange }: QuestionInputProps) {
  const min = typeof question.settings.min === "number" ? question.settings.min : 0;
  const max = typeof question.settings.max === "number" ? question.settings.max : 100;
  const step = typeof question.settings.step === "number" ? question.settings.step : 1;
  const current = typeof value?.answerValue === "number" ? value.answerValue : Math.round((min + max) / 2);
  return (
    <div className="space-y-4 rounded-xl border border-border/70 bg-muted/20 px-4 py-5">
      <Slider min={min} max={max} step={step} value={[current]} onValueChange={([n]) => onChange({ answerValue: n })} />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{min}</span>
        <span className="rounded-md bg-background px-2.5 py-1 text-sm font-semibold tabular-nums text-foreground shadow-sm">
          {current}
        </span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export function LikertInput({ question, value, onChange }: QuestionInputProps) {
  const selected = value?.choiceIds?.[0];
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {question.choices.map((choice) => {
        const active = selected === choice.id;
        return (
          <button
            key={choice.id}
            type="button"
            onClick={() => onChange({ choiceIds: [choice.id] })}
            className={cn(
              "rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all",
              "hover:border-primary/40 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-brand-core bg-primary/5 text-brand-core ring-2 ring-primary/20 ring-offset-1"
                : "border-border bg-background text-foreground",
            )}
            aria-pressed={active}
          >
            {choice.label}
          </button>
        );
      })}
    </div>
  );
}
