"use client";

import { useCallback, useMemo } from "react";
import {
  Users2,
  DollarSign,
  Clock,
  TrendingUp,
  Headphones,
  Calculator,
  Package,
  Hammer,
  FileSignature,
  ClipboardList,
  LayoutDashboard,
  BookOpen,
  MessageCircle,
  Check,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  MODULE_CATALOG,
  MODULE_GROUPS,
  MODULE_QUESTIONS,
  ALWAYS_ENABLED_MODULES,
  type ModuleQuestion,
} from "../lib/constants";
import type { OrgModuleKey, WizardData } from "../lib/wizard-data-schema";
import { NavButtons } from "./nav-buttons";
import { StepBody } from "./step-body";

type StepProductsProps = {
  data: WizardData;
  patch: (updates: Partial<WizardData>) => void;
  onBack: () => void;
  onNext: () => void;
};

const MODULE_ICONS: Record<OrgModuleKey, React.ElementType> = {
  hr: Users2,
  payroll: DollarSign,
  timesheets: Clock,
  crm: TrendingUp,
  support: Headphones,
  accounting: Calculator,
  inventory: Package,
  build: Hammer,
  sign: FileSignature,
  surveys: ClipboardList,
  chat: MessageCircle,
  kb: BookOpen,
};

const ALWAYS_SET = new Set<string>(ALWAYS_ENABLED_MODULES);

function ChipRadioGroup({
  question,
  value,
  onChange,
}: {
  question: Extract<ModuleQuestion, { type: "select" }>;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={question.label}
      className="flex min-w-0 flex-wrap gap-1.5"
    >
      {question.options.map((opt) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(selected ? "" : opt)}
            className={cn(
              "inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function ModuleQuestionField({
  question,
  value,
  onChange,
}: {
  question: ModuleQuestion;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <p className="text-xs text-muted-foreground">
        {question.label}{" "}
        <span className="text-xs text-muted-foreground/60">(Optional)</span>
      </p>
      {question.type === "select" ? (
        <ChipRadioGroup question={question} value={value} onChange={onChange} />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.label}
          maxLength={question.maxLength}
          className="h-8 text-sm"
        />
      )}
    </div>
  );
}

function ModuleCard({
  moduleKey,
  isChecked,
  isAlways,
  answers,
  onToggle,
  onAnswerChange,
}: {
  moduleKey: OrgModuleKey;
  isChecked: boolean;
  isAlways: boolean;
  answers: Record<string, string>;
  onToggle: (key: OrgModuleKey) => void;
  onAnswerChange: (moduleKey: OrgModuleKey, qKey: string, val: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const meta = MODULE_CATALOG[moduleKey];
  const Icon = MODULE_ICONS[moduleKey];
  const questions = MODULE_QUESTIONS[moduleKey] ?? [];
  const showQuestions = isChecked && !isAlways && questions.length > 0;

  const handleToggle = useCallback(() => {
    if (!isAlways) onToggle(moduleKey);
  }, [isAlways, moduleKey, onToggle]);

  const handleAnswerChange = useCallback(
    (qKey: string, val: string) => {
      onAnswerChange(moduleKey, qKey, val);
    },
    [moduleKey, onAnswerChange],
  );

  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border transition-colors",
        isChecked ? "border-primary/40 bg-primary/5" : "border-border bg-card",
        isAlways && "opacity-70",
      )}
    >
      <button
        type="button"
        disabled={isAlways}
        onClick={handleToggle}
        aria-pressed={isChecked}
        className="flex min-h-[44px] min-w-0 w-full items-start gap-3 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset rounded-xl"
      >
        <span
          className={cn(
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
            isChecked
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
          aria-hidden
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="block text-sm font-medium text-foreground">
              {meta.label}
            </span>
            {isAlways && (
              <span className="text-xs font-normal text-muted-foreground">
                Always on
              </span>
            )}
          </span>
          <span className="block text-xs leading-relaxed text-muted-foreground">
            {meta.description}
          </span>
        </span>
        {!isAlways && (
          <span
            className={cn(
              "mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
              isChecked
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/40 bg-background",
            )}
            aria-hidden
          >
            {isChecked && <Check className="h-2.5 w-2.5" />}
          </span>
        )}
      </button>

      <AnimatePresence>
        {showQuestions && (
          <motion.div
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/50 px-3 pb-3 pt-2.5 space-y-3">
              {questions.map((q) => (
                <ModuleQuestionField
                  key={q.key}
                  question={q}
                  value={answers[q.key] ?? ""}
                  onChange={(val) => handleAnswerChange(q.key, val)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AlwaysOnCard({
  label,
  description,
  Icon,
}: {
  label: string;
  description: string;
  Icon: React.ElementType;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-dashed border-border bg-muted/30">
      <div className="flex min-h-[44px] min-w-0 w-full items-start gap-3 p-3">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
          aria-hidden
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="block text-sm font-medium text-foreground">{label}</span>
            <span className="text-xs font-normal text-muted-foreground">Always on</span>
          </span>
          <span className="block text-xs leading-relaxed text-muted-foreground">{description}</span>
        </span>
      </div>
    </div>
  );
}

export function StepProducts({ data, patch, onBack, onNext }: StepProductsProps) {
  const enabledSet = useMemo(() => new Set(data.modules), [data.modules]);

  const extraCount = useMemo(
    () => data.modules.filter((m) => !ALWAYS_SET.has(m)).length,
    [data.modules],
  );

  const handleToggle = useCallback(
    (key: OrgModuleKey) => {
      if (ALWAYS_SET.has(key)) return;
      const next = enabledSet.has(key)
        ? data.modules.filter((m) => m !== key)
        : [...data.modules, key];
      patch({ modules: next });
    },
    [enabledSet, data.modules, patch],
  );

  const handleAnswerChange = useCallback(
    (moduleKey: OrgModuleKey, qKey: string, val: string) => {
      const existing = data.moduleAnswers[moduleKey] ?? {};
      patch({
        moduleAnswers: {
          ...data.moduleAnswers,
          [moduleKey]: { ...existing, [qKey]: val },
        },
      });
    },
    [data.moduleAnswers, patch],
  );

  return (
    <StepBody
      footer={
        <NavButtons
          onBack={onBack}
          onNext={onNext}
        />
      }
    >
      <p className="text-label leading-relaxed text-muted-foreground">
        Home and Knowledge base are always on. Add the modules your team needs.
        {extraCount > 0 && (
          <span className="ml-1 font-medium text-foreground">
            {extraCount} extra {extraCount === 1 ? "module" : "modules"} selected.
          </span>
        )}
      </p>

      <div className="min-w-0 space-y-5">
        {MODULE_GROUPS.map((group) => (
          <section key={group.heading} className="min-w-0 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.heading}
            </h3>
            <div className="grid min-w-0 grid-cols-1 items-start gap-2 sm:grid-cols-2">
              {group.keys.map((key) => (
                <ModuleCard
                  key={key}
                  moduleKey={key}
                  isChecked={enabledSet.has(key)}
                  isAlways={false}
                  answers={(data.moduleAnswers[key] ?? {}) as Record<string, string>}
                  onToggle={handleToggle}
                  onAnswerChange={handleAnswerChange}
                />
              ))}
            </div>
          </section>
        ))}

        <section className="min-w-0 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Always included
          </h3>
          <div className="grid min-w-0 grid-cols-1 items-start gap-2 sm:grid-cols-2">
            <AlwaysOnCard
              label="Home"
              description="Dashboard, chat, calendar, mail and tasks"
              Icon={LayoutDashboard}
            />
            <AlwaysOnCard
              label="Knowledge base"
              description={MODULE_CATALOG.kb.description}
              Icon={BookOpen}
            />
          </div>
        </section>
      </div>
    </StepBody>
  );
}
