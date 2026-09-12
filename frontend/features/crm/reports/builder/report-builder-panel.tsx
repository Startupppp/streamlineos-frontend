"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ReportingSource } from "@/types/crm/reporting";
import {
  DEFAULT_REPORT_BUILDER_VALUES,
  reportBuilderSchema,
  type ReportBuilderValues,
} from "./report-builder-schema";
import { ReportBuilderForm } from "./report-builder-form";

interface ReportBuilderPanelProps {
  initialValues: ReportBuilderValues;
  sources: readonly ReportingSource[];
  isRunning: boolean;
  canSave: boolean;
  canExplain: boolean;
  onRun: (values: ReportBuilderValues) => void;
  onSave: (values: ReportBuilderValues) => void;
  onExplain: (values: ReportBuilderValues) => void;
}

/**
 * The form, and the only thing that owns it.
 *
 * It takes its starting values as a prop and is remounted by `key` when the
 * report being edited changes, rather than being reset from an effect. That is
 * the difference between "the form is derived from which report is open" and
 * "something writes into the form after the fact" — the second is what leaves a
 * half-loaded form on screen when a fetch resolves while somebody is typing.
 */
export function ReportBuilderPanel({
  initialValues,
  sources,
  isRunning,
  canSave,
  canExplain,
  onRun,
  onSave,
  onExplain,
}: ReportBuilderPanelProps) {
  const form = useForm<ReportBuilderValues>({
    resolver: zodResolver(reportBuilderSchema),
    defaultValues: initialValues,
  });

  /** A new source invalidates every field chosen under the old one. */
  function handleSourceChange(sourceKey: string) {
    form.reset({ ...DEFAULT_REPORT_BUILDER_VALUES, source: sourceKey });
  }

  return (
    <ReportBuilderForm
      form={form}
      sources={sources}
      isRunning={isRunning}
      canSave={canSave}
      canExplain={canExplain}
      onSubmit={onRun}
      onSave={onSave}
      onExplain={onExplain}
      onSourceChange={handleSourceChange}
    />
  );
}
