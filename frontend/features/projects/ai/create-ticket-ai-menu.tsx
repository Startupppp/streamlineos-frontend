"use client";

import { useCallback, useMemo, useRef } from "react";
import { useCan } from "@/hooks/api/access";
import { AiActionsMenu, type AiAction, type AiActionResult } from "@/components/ai";
import {
  useTicketDraftSuggestTitle,
  useTicketDraftImproveDescription,
  useTicketDraftSuggestFields,
  type TicketSuggestFieldsResult,
} from "@/hooks/api/projects/ticket-ai";
import type { TicketPriority } from "@/types/projects";

export interface CreateTicketAiFieldPatch {
  priority?: TicketPriority;
  points?: number | null;
  labelIds?: number[];
}

interface CreateTicketAiMenuProps {
  projectId: number | null;
  title: string;
  description: string;
  onApplyTitle: (title: string) => void;
  onApplyDescription: (html: string) => void;
  onApplyFields: (patch: CreateTicketAiFieldPatch) => void;
  disabled?: boolean;
}

function hasDraftContent(title: string, description: string): boolean {
  const plain = description.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return title.trim().length > 0 || plain.length > 0;
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

export function CreateTicketAiMenu({
  projectId,
  title,
  description,
  onApplyTitle,
  onApplyDescription,
  onApplyFields,
  disabled = false,
}: CreateTicketAiMenuProps) {
  const canUseAI = useCan("projects:ai:use");
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

  const runSuggestTitle = useCallback((): Promise<AiActionResult> => {
    if (projectId == null) {
      return Promise.reject(new Error("Select a project first"));
    }
    if (!hasDraftContent(title, description)) {
      return Promise.reject(new Error("Add a title or description first"));
    }
    return suggestTitleMutation.mutateAsync(draftInput()).then((d) => ({ text: d.title }));
  }, [projectId, title, description, suggestTitleMutation, draftInput]);

  const runImprove = useCallback((): Promise<AiActionResult> => {
    if (projectId == null) {
      return Promise.reject(new Error("Select a project first"));
    }
    if (!hasDraftContent(title, description)) {
      return Promise.reject(new Error("Add a title or description first"));
    }
    return improveMutation.mutateAsync(draftInput()).then((d) => ({ text: d.description }));
  }, [projectId, title, description, improveMutation, draftInput]);

  const runSuggestFields = useCallback((): Promise<AiActionResult> => {
    if (projectId == null) {
      return Promise.reject(new Error("Select a project first"));
    }
    if (!hasDraftContent(title, description)) {
      return Promise.reject(new Error("Add a title or description first"));
    }
    return suggestFieldsMutation.mutateAsync(draftInput()).then((data) => {
      lastFieldsRef.current = data;
      return formatSuggestedFields(data);
    });
  }, [projectId, title, description, suggestFieldsMutation, draftInput]);

  const handleApplyFields = useCallback(() => {
    const data = lastFieldsRef.current;
    if (!data) return;
    onApplyFields({
      priority: data.priority,
      points: data.points,
      labelIds: data.labelIds,
    });
  }, [onApplyFields]);

  const actions: AiAction[] = useMemo(
    () => [
      {
        key: "suggest-title",
        label: "Suggest title",
        description: "Generate a title from the description",
        run: runSuggestTitle,
        onApply: onApplyTitle,
        applyLabel: "Use this title",
      },
      {
        key: "improve-description",
        label: "Improve description",
        description: "AI-polished HTML description, draft first",
        run: runImprove,
        onApply: onApplyDescription,
        applyLabel: "Apply description",
      },
      {
        key: "suggest-fields",
        label: "Suggest priority & labels",
        description: "Priority, estimate, and matching labels",
        run: runSuggestFields,
        onApply: handleApplyFields,
        applyLabel: "Apply suggestions",
      },
    ],
    [runSuggestTitle, runImprove, runSuggestFields, onApplyTitle, onApplyDescription, handleApplyFields],
  );

  if (!canUseAI) return null;

  return (
    <AiActionsMenu
      actions={actions}
      triggerLabel="AI"
      menuLabel="Issue AI"
      align="end"
      disabled={disabled || projectId == null}
    />
  );
}
