"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useReportNlPropose } from "@/hooks/api/crm/reporting";
import type { ReportNlProposal, ReportingQueryDescription } from "@/types/crm/reporting";

interface ReportNlProposePanelProps {
  onAccept: (description: ReportingQueryDescription) => void;
}

export function ReportNlProposePanel({ onAccept }: ReportNlProposePanelProps) {
  const [question, setQuestion] = useState("");
  const [proposal, setProposal] = useState<ReportNlProposal | null>(null);
  const propose = useReportNlPropose();

  const handleQuestionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuestion(event.target.value);
  };

  const handleAsk = () => {
    const trimmed = question.trim();
    if (!trimmed) return;
    setProposal(null);
    propose.mutate(trimmed, { onSuccess: setProposal });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") handleAsk();
  };

  const handleAccept = () => {
    if (proposal?.accepted) onAccept(proposal.description);
    setProposal(null);
    setQuestion("");
  };

  const handleDiscard = () => {
    setProposal(null);
  };

  return (
    <div className={cn(CONTENT_PANEL_SOLID, "flex shrink-0 flex-col gap-2 p-3")}>
      <div className="flex items-center gap-2">
        <Input
          value={question}
          onChange={handleQuestionChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask in plain English, e.g. “deals won last quarter by rep”"
          className="flex-1"
        />
        <LoadingButton
          isPending={propose.isPending}
          size="sm"
          onClick={handleAsk}
          disabled={question.trim().length === 0}
        >
          Ask
        </LoadingButton>
      </div>

      {propose.isError ? (
        <p className="text-label text-status-danger-ink">{getErrorMessage(propose.error)}</p>
      ) : null}

      {proposal && !proposal.accepted ? (
        <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/40 p-2.5">
          <p className="text-label text-muted-foreground">{proposal.reason}</p>
          <LoadingButton isPending={false} variant="ghost" size="sm" onClick={handleDiscard}>
            Dismiss
          </LoadingButton>
        </div>
      ) : null}

      {proposal?.accepted ? (
        <div className="flex flex-col gap-2 rounded-md border border-primary/20 bg-primary/5 p-2.5">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="shrink-0">
              Proposed
            </Badge>
            <p className="text-label">{proposal.explanation}</p>
          </div>
          <p className="font-mono text-micro text-muted-foreground">
            {proposal.preview.parameterCount} bound value
            {proposal.preview.parameterCount === 1 ? "" : "s"} · {proposal.preview.columns.length}{" "}
            column
            {proposal.preview.columns.length === 1 ? "" : "s"}
          </p>
          <div className="flex justify-end gap-2">
            <LoadingButton isPending={false} variant="outline" size="sm" onClick={handleDiscard}>
              Discard
            </LoadingButton>
            <LoadingButton isPending={false} size="sm" onClick={handleAccept}>
              Use this
            </LoadingButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}
