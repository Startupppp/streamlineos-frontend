"use client";

import { useCallback, useMemo } from "react";
import { useCan } from "@/hooks/api/access";
import { AiActionsMenu, type AiAction, type AiActionResult } from "@/components/ai";
import {
  useProjectAiSummary,
  useProjectAiRisks,
  useWeeklyUpdate,
  useAskProjectAi,
} from "@/hooks/api/projects/ai";
import type {
  ProjectSummaryResult,
  ProjectRisksResult,
  WeeklyUpdateResult,
  AskResult,
} from "@/types/projects/ai";

interface ProjectAiMenuProps {
  projectId: number;
}

function formatSummary(data: ProjectSummaryResult): AiActionResult {
  const lines: string[] = [data.summary];
  if (data.highlights.length > 0) {
    lines.push("", "Highlights:");
    for (const h of data.highlights) lines.push(`• ${h}`);
  }
  if (data.atRisk) lines.push("", "⚠ Project is currently at risk.");
  return { text: lines.join("\n") };
}

function formatRisks(data: ProjectRisksResult): AiActionResult {
  if (data.risks.length === 0) return { text: "No significant risks detected at this time." };
  const lines: string[] = [];
  for (const r of data.risks) {
    lines.push(`[${r.severity.toUpperCase()}] ${r.title}`);
    lines.push(`  ${r.rationale}`);
    lines.push(`  Mitigation: ${r.mitigation}`);
    lines.push("");
  }
  return { text: lines.join("\n").trimEnd() };
}

function formatWeeklyUpdate(data: WeeklyUpdateResult): AiActionResult {
  const lines: string[] = [data.headline, ""];
  if (data.completedHighlights.length > 0) {
    lines.push("Completed:");
    for (const c of data.completedHighlights) lines.push(`• ${c}`);
    lines.push("");
  }
  if (data.upcomingFocus.length > 0) {
    lines.push("Coming up:");
    for (const u of data.upcomingFocus) lines.push(`• ${u}`);
    lines.push("");
  }
  if (data.blockers.length > 0) {
    lines.push("Blockers:");
    for (const b of data.blockers) lines.push(`• ${b}`);
  }
  const citations = data.citations.map((c, i) => ({ id: i, title: c.label }));
  return { text: lines.join("\n").trimEnd(), citations: citations.length > 0 ? citations : undefined };
}

function formatAsk(data: AskResult): AiActionResult {
  return {
    text: data.answer,
    confidence: data.confidence === "high" ? 0.9 : data.confidence === "medium" ? 0.65 : 0.4,
  };
}

export function ProjectAiMenu({ projectId }: ProjectAiMenuProps) {
  const canUseAI = useCan("projects:ai:use");
  const summaryMutation = useProjectAiSummary(projectId);
  const risksMutation = useProjectAiRisks(projectId);
  const weeklyMutation = useWeeklyUpdate(projectId);
  const askMutation = useAskProjectAi(projectId);

  const runSummary = useCallback((): Promise<AiActionResult> => {
    return summaryMutation.mutateAsync(undefined).then(formatSummary);
  }, [summaryMutation]);

  const runRisks = useCallback((): Promise<AiActionResult> => {
    return risksMutation.mutateAsync(undefined).then(formatRisks);
  }, [risksMutation]);

  const runWeeklyUpdate = useCallback((): Promise<AiActionResult> => {
    return weeklyMutation.mutateAsync(undefined).then(formatWeeklyUpdate);
  }, [weeklyMutation]);

  const runAsk = useCallback((): Promise<AiActionResult> => {
    return askMutation.mutateAsync({ question: "What is the current status and what needs attention?" }).then(formatAsk);
  }, [askMutation]);

  const actions: AiAction[] = useMemo(() => [
    { key: "summary", label: "Health summary", description: "Overall status, highlights & risk level", run: runSummary, surface: "sheet" },
    { key: "risks", label: "Detect risks", description: "Surface blockers and risk factors", run: runRisks, surface: "sheet" },
    { key: "weekly-update", label: "Weekly update draft", description: "Ready-to-share progress report", run: runWeeklyUpdate, surface: "sheet" },
    { key: "ask", label: "Ask about this project", description: "What needs attention right now?", run: runAsk, surface: "popover" },
  ], [runSummary, runRisks, runWeeklyUpdate, runAsk]);

  if (!canUseAI) return null;

  return (
    <AiActionsMenu
      actions={actions}
      triggerLabel="AI"
      menuLabel="Project AI"
      align="end"
    />
  );
}
