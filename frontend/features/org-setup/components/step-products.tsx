"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrgSetupPreviewMutation } from "@/hooks/api/org-setup";
import type { OrgSetupPreview } from "@/hooks/api/org-setup-schema";
import {
  MODULE_CATALOG,
  ALWAYS_ENABLED_MODULES,
} from "../lib/constants";
import type { OrgModuleKey, WizardData } from "../lib/wizard-data-schema";
import type { AdaptiveQuestion, FrontendModuleAdapter } from "../lib/module-adapters/index";
import { buildAdapter } from "../lib/module-adapters/build.adapter";
import { NavButtons } from "./nav-buttons";
import { StepBody } from "./step-body";

const MODULE_ADAPTERS: Record<string, FrontendModuleAdapter> = {
  build: buildAdapter,
};

type StepProductsProps = {
  data: WizardData;
  patch: (updates: Partial<WizardData>) => void;
  onBack: () => void;
  onNext: () => void;
};

function AdaptiveQuestionField({
  question,
  value,
  onChange,
}: {
  question: AdaptiveQuestion;
  value: string;
  onChange: (val: string) => void;
}) {
  if (question.type === "select" && question.options) {
    return (
      <div className="min-w-0 space-y-0.5">
        <label className="block text-xs text-muted-foreground">{question.label}</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">Select…</option>
          {question.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-0.5">
      <label className="block text-xs text-muted-foreground">{question.label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.label}
        className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
      />
    </div>
  );
}

function QuotaBanner({ preview }: { preview: OrgSetupPreview }) {
  const { usedSeats, seats } = preview.quotaSnapshot;
  const remaining = seats - usedSeats;

  return (
    <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">Seat quota:</span>{" "}
      {usedSeats} used of {seats} —{" "}
      {remaining > 0 ? (
        <span className="text-status-success-ink">{remaining} available</span>
      ) : (
        <span className="text-status-warning-ink">at capacity</span>
      )}
    </div>
  );
}

export function StepProducts({ data, patch, onBack, onNext }: StepProductsProps) {
  const [preview, setPreview] = useState<OrgSetupPreview | null>(null);
  const previewMutation = useOrgSetupPreviewMutation();

  const always = new Set<string>(ALWAYS_ENABLED_MODULES);
  const enabledSet = new Set<string>(data.modules);

  function handleToggle(key: OrgModuleKey) {
    if (always.has(key)) return;
    const next = enabledSet.has(key)
      ? data.modules.filter((m) => m !== key)
      : [...data.modules, key];
    patch({ modules: next });
    setPreview(null);
  }

  function handleAnswerChange(moduleKey: string, questionKey: string, value: string) {
    const existing = data.moduleAnswers[moduleKey] ?? {};
    patch({
      moduleAnswers: {
        ...data.moduleAnswers,
        [moduleKey]: { ...existing, [questionKey]: value },
      },
    });
  }

  async function handlePreview() {
    try {
      const result = await previewMutation.mutateAsync({
        modules: data.modules,
      });
      setPreview(result);
    } catch {
      setPreview(null);
    }
  }

  const catalogEntries = Object.entries(MODULE_CATALOG) as [
    OrgModuleKey,
    { label: string; description: string; setupTasks: string[] },
  ][];

  return (
    <StepBody footer={<NavButtons onBack={onBack} onNext={onNext} />}>
      <p className="text-label leading-relaxed text-muted-foreground">
        Choose the products you want to start with. Chat and Knowledge are always included.
      </p>

      <div className="min-w-0 space-y-2">
        {catalogEntries.map(([key, meta]) => {
          const isAlways = always.has(key);
          const isChecked = enabledSet.has(key);
          const adapter = MODULE_ADAPTERS[key];
          const answers = data.moduleAnswers[key] ?? {};

          return (
            <div
              key={key}
              className={cn(
                "min-w-0 rounded-xl border bg-card transition-colors",
                isChecked ? "border-primary/40 bg-primary/5" : "border-border",
                isAlways && "opacity-70",
              )}
            >
              <button
                type="button"
                disabled={isAlways}
                onClick={() => handleToggle(key)}
                className="flex min-w-0 w-full items-start gap-3 p-3 text-left"
                aria-pressed={isChecked}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                    isChecked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/40 bg-background",
                  )}
                  aria-hidden
                >
                  {isChecked && <Check className="h-3 w-3" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">
                    {meta.label}
                    {isAlways && (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        (always included)
                      </span>
                    )}
                  </span>
                  <span className="block text-xs leading-relaxed text-muted-foreground">
                    {meta.description}
                  </span>
                </span>
              </button>

              {isChecked && !isAlways && adapter && adapter.adaptiveQuestions.length > 0 && (
                <div className="border-t border-border/50 px-3 pb-3 pt-2 space-y-2">
                  {adapter.adaptiveQuestions.map((question) => (
                    <AdaptiveQuestionField
                      key={question.key}
                      question={question}
                      value={String(answers[question.key] ?? "")}
                      onChange={(val) => handleAnswerChange(key, question.key, val)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="min-w-0">
        <button
          type="button"
          onClick={handlePreview}
          disabled={previewMutation.isPending}
          className="text-xs text-primary underline-offset-2 hover:underline disabled:opacity-50"
        >
          {previewMutation.isPending ? "Checking quota…" : "Preview seat usage"}
        </button>
        {preview && <QuotaBanner preview={preview} />}
      </div>
    </StepBody>
  );
}
