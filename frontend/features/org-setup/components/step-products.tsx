"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Check,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  useOrgSetupPreviewMutation,
  type OrgSetupPreviewPayload,
} from "@/hooks/api/org-setup";
import type { OrgSetupPreview } from "@/hooks/api/org-setup-schema";
import {
  MODULE_CATALOG,
  MODULE_GROUPS,
  ALWAYS_ENABLED_MODULES,
  selectOnboardingQuestions,
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
              <span className="text-xs text-muted-foreground">(Optional)</span>
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
  questions,
  onToggle,
  onAnswerChange,
}: {
  isAlways: boolean;
  isChecked: boolean;
  moduleKey: OrgModuleKey;
  answers: Record<string, string>;
  questions: readonly ModuleQuestion[];
  onToggle: (key: OrgModuleKey) => void;
  onAnswerChange: (moduleKey: OrgModuleKey, qKey: string, val: string) => void;
}) {
  const reduceMotion = useReducedMotion();
  const meta = MODULE_CATALOG[moduleKey];
  const Icon = MODULE_ICONS[moduleKey];
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
            <span className="block text-sm font-medium text-foreground">
              {label}
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              Always on
            </span>
          </span>
          <span className="block text-xs leading-relaxed text-muted-foreground">
            {description}
          </span>
        </span>
      </div>
    </div>
  );
}

export function StepProducts({
  data,
  patch,
  onBack,
  onNext,
}: StepProductsProps) {
  const enabledSet = useMemo(() => new Set(data.modules), [data.modules]);
  const [preview, setPreview] = useState<OrgSetupPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewRequestRef = useRef(0);
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const retryPreview = useCallback(() => setPreviewAttempt((n) => n + 1), []);
  const { mutateAsync: previewSelection, isPending: previewPending } =
    useOrgSetupPreviewMutation();

  const extraCount = useMemo(
    () => data.modules.filter((m) => !ALWAYS_SET.has(m)).length,
    [data.modules],
  );

  const visibleQuestions = useMemo(
    () => selectOnboardingQuestions(data.modules),
    [data.modules],
  );

  const moduleSelectionKey = useMemo(
    () => [...data.modules].sort().join(","),
    [data.modules],
  );

  useEffect(() => {
    const requestId = ++previewRequestRef.current;
    const timer = window.setTimeout(() => {
      setPreviewError(null);
      const payload: OrgSetupPreviewPayload = { modules: data.modules };
      void previewSelection(payload)
        .then((result) => {
          if (previewRequestRef.current !== requestId) return;
          setPreview(result);
        })
        .catch(() => {
          if (previewRequestRef.current !== requestId) return;
          setPreview(null);
          setPreviewError(
            "We couldn't verify product availability. Check your connection and try again.",
          );
        });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [data.modules, moduleSelectionKey, previewSelection, previewAttempt]);

  const blockedModules = useMemo(
    () => preview?.modules.filter((module) => !module.eligible) ?? [],
    [preview],
  );
  const previewMatchesSelection =
    preview !== null &&
    preview.modules.length === data.modules.length &&
    preview.modules.every((module) =>
      enabledSet.has(module.moduleKey as OrgModuleKey),
    );
  const canContinue =
    extraCount > 0 &&
    previewMatchesSelection &&
    blockedModules.length === 0 &&
    !previewPending &&
    !previewError;

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
          nextDisabled={!canContinue}
        />
      }
    >
      <p className="text-label leading-relaxed text-muted-foreground">
        Home and Knowledge base are always on. Add the modules your team needs.
        {extraCount > 0 && (
          <span className="ml-1 font-medium text-foreground">
            {extraCount} extra {extraCount === 1 ? "module" : "modules"}{" "}
            selected.
          </span>
        )}
      </p>

      {extraCount === 0 ? (
        <p role="alert" className="text-xs text-status-warning-ink">
          Choose at least one product to continue. Home and Knowledge base are
          always on and do not count toward this.
        </p>
      ) : null}

      {!previewError && (previewPending || !previewMatchesSelection) ? (
        <p aria-live="polite" className="text-xs text-muted-foreground">
          Checking product availability…
        </p>
      ) : null}

      {previewError ? (
        <p role="alert" className="text-xs text-destructive">
          {previewError}{" "}
          <button
            type="button"
            onClick={retryPreview}
            className="font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Retry
          </button>
        </p>
      ) : null}

      {blockedModules.length > 0 ? (
        <div
          role="alert"
          className="rounded-lg border border-status-warning-rule bg-status-warning-surface p-3 text-xs text-status-warning-ink"
        >
          {blockedModules.map((module) => (
            <p key={module.moduleKey}>
              {MODULE_CATALOG[module.moduleKey as OrgModuleKey]?.label ??
                module.moduleKey}
              : {module.reason ?? "Unavailable on the current plan"}
            </p>
          ))}
        </div>
      ) : null}

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
                  answers={
                    (data.moduleAnswers[key] ?? {}) as Record<string, string>
                  }
                  questions={visibleQuestions[key] ?? []}
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
