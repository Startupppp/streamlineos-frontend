"use client";

import { useCallback, useMemo, useRef } from "react";
import { useCan } from "@/hooks/api/access";
import {
  AiFieldTrigger,
  type AiActionResult,
  type AiInlineSession,
  useAiInlineAction,
} from "@/components/ai";
import {
  useTicketDraftSuggestTitle,
  useTicketDraftImproveDescription,
  useTicketDraftSuggestFields,
  type TicketSuggestFieldsResult,
} from "@/hooks/api/build/ticket-ai";
import type { TicketPriority } from "@/types/projects";

export interface CreateTicketAiFieldPatch {
  priority?: TicketPriority;
  points?: number | null;
  labelIds?: number[];
}

interface CreateTicketAiContext {
  projectId: number | null;
  title: string;
  description: string;
  onApplyTitle: (title: string) => void;
  onApplyDescription: (html: string) => void;
  onApplyFields: (patch: CreateTicketAiFieldPatch) => void;
  onTitleInlineChange: (session: AiInlineSession | null) => void;
  onDescriptionInlineChange: (session: AiInlineSession | null) => void;
  onFieldsInlineChange: (session: AiInlineSession | null) => void;
  disabled?: boolean;
}

function getPlainDescriptionText(description: string): string {
  return description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function getProjectDisabledReason(projectId: number | null): string | undefined {
  if (projectId == null) return "Select a project first";
  return undefined;
}

function getSuggestTitleDisabledReason(
  projectId: number | null,
  description: string,
): string | undefined {
  const projectReason = getProjectDisabledReason(projectId);
  if (projectReason) return projectReason;
  if (getPlainDescriptionText(description).length === 0) {
    return "Add a description first";
  }
  return undefined;
}

function getImproveDescriptionDisabledReason(
  projectId: number | null,
  title: string,
  description: string,
): string | undefined {
  const projectReason = getProjectDisabledReason(projectId);
  if (projectReason) return projectReason;
  if (title.trim().length === 0 && getPlainDescriptionText(description).length === 0) {
    return "Add a title or description first";
  }
  return undefined;
}

function getSuggestFieldsDisabledReason(
  projectId: number | null,
  title: string,
  description: string,
): string | undefined {
  return getImproveDescriptionDisabledReason(projectId, title, description);
}

function formatSuggestedFields(data: TicketSuggestFieldsResult): AiActionResult {
  const lines: string[] = [
    `Priority: ${data.priority}`,
    `Estimate: ${data.points == null ? "—" : `${data.points} points`}`,
  ];
  if (data.labelNames.length > 0) {
    lines.push(`Labels: ${data.labelNames.join(", ")}`);
  } else {
    lines.push("Labels: —");
  }
  lines.push("", data.rationale);
  return { text: lines.join("\n") };
}

export function useCreateTicketAi({
  projectId,
  title,
  description,
  onApplyTitle,
  onApplyDescription,
  onApplyFields,
  onTitleInlineChange,
  onDescriptionInlineChange,
  onFieldsInlineChange,
  disabled = false,
}: CreateTicketAiContext) {
  const canUseAI = useCan("build:ai:use");
  const resolvedProjectId = projectId ?? 0;
  const suggestTitleMutation = useTicketDraftSuggestTitle(resolvedProjectId);
  const improveMutation = useTicketDraftImproveDescription(resolvedProjectId);
  const suggestFieldsMutation = useTicketDraftSuggestFields(resolvedProjectId);
  const lastFieldsRef = useRef<TicketSuggestFieldsResult | null>(null);

  const draftInput = useCallback(() => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    return {
      ...(trimmedTitle ? { title: trimmedTitle } : {}),
      ...(trimmedDescription ? { description: trimmedDescription } : {}),
    };
  }, [title, description]);

  const suggestTitleDisabledReason = getSuggestTitleDisabledReason(projectId, description);
  const improveDescriptionDisabledReason = getImproveDescriptionDisabledReason(
    projectId,
    title,
    description,
  );
  const suggestFieldsDisabledReason = getSuggestFieldsDisabledReason(
    projectId,
    title,
    description,
  );

  const runSuggestTitle = useCallback((): Promise<AiActionResult> => {
    return suggestTitleMutation.mutateAsync(draftInput()).then((d) => ({ text: d.title }));
  }, [suggestTitleMutation, draftInput]);

  const runImprove = useCallback((): Promise<AiActionResult> => {
    return improveMutation.mutateAsync(draftInput()).then((d) => ({ text: d.description }));
  }, [improveMutation, draftInput]);

  const runSuggestFields = useCallback((): Promise<AiActionResult> => {
    return suggestFieldsMutation.mutateAsync(draftInput()).then((data) => {
      lastFieldsRef.current = data;
      return formatSuggestedFields(data);
    });
  }, [suggestFieldsMutation, draftInput]);

  const handleApplyFieldsFromText = useCallback((_text: string) => {
    const data = lastFieldsRef.current;
    if (!data) return;
    onApplyFields({
      priority: data.priority,
      points: data.points,
      labelIds: data.labelIds,
    });
  }, [onApplyFields]);

  const titleAction = useAiInlineAction({
    actionKey: "suggest-title",
    run: runSuggestTitle,
    onApply: onApplyTitle,
    onSessionChange: onTitleInlineChange,
  });

  const descriptionAction = useAiInlineAction({
    actionKey: "improve-description",
    run: runImprove,
    onApply: onApplyDescription,
    onSessionChange: onDescriptionInlineChange,
  });

  const fieldsAction = useAiInlineAction({
    actionKey: "suggest-fields",
    run: runSuggestFields,
    onApply: handleApplyFieldsFromText,
    onSessionChange: onFieldsInlineChange,
  });

  return useMemo(
    () => ({
      canUseAI,
      titleTrigger: {
        label: "Suggest title",
        disabledReason: suggestTitleDisabledReason,
        disabled,
        isPending: titleAction.isPending || suggestTitleMutation.isPending,
        onClick: titleAction.run,
      },
      descriptionTrigger: {
        label: "Improve description",
        disabledReason: improveDescriptionDisabledReason,
        disabled,
        isPending: descriptionAction.isPending || improveMutation.isPending,
        onClick: descriptionAction.run,
      },
      fieldsTrigger: {
        label: "Suggest priority and labels",
        disabledReason: suggestFieldsDisabledReason,
        disabled,
        isPending: fieldsAction.isPending || suggestFieldsMutation.isPending,
        onClick: fieldsAction.run,
      },
    }),
    [
      canUseAI,
      suggestTitleDisabledReason,
      improveDescriptionDisabledReason,
      suggestFieldsDisabledReason,
      disabled,
      titleAction.isPending,
      titleAction.run,
      descriptionAction.isPending,
      descriptionAction.run,
      fieldsAction.isPending,
      fieldsAction.run,
      suggestTitleMutation.isPending,
      improveMutation.isPending,
      suggestFieldsMutation.isPending,
    ],
  );
}

interface CreateTicketAiFieldTriggerProps {
  label: string;
  disabledReason?: string;
  disabled?: boolean;
  isPending?: boolean;
  onClick: () => void;
  className?: string;
}

export function CreateTicketAiFieldTrigger(props: CreateTicketAiFieldTriggerProps) {
  return <AiFieldTrigger {...props} />;
}
