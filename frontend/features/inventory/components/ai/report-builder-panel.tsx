"use client";

import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { AiGeneratedLabel } from "@/components/ai/ai-generated-label";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePermissionGate } from "@/hooks/api/access";
import {
  INV_REPORT_QUESTION_MAX,
  INV_REPORT_QUESTION_MIN,
  useInvReportAsk,
  useInvReportCatalog,
  useInvReportExport,
  type InvReportCatalogEntry,
  type InvReportSpec,
} from "@/hooks/api/inventory/report-builder";
import { ReportBuilderPreview } from "./report-builder-preview";

/**
 * F5 — the natural-language report builder.
 *
 * The whole surface had no caller: three finished routes, carefully defended,
 * and no hook, no page and no link anywhere in this repo. A feature nobody can
 * reach has not shipped.
 *
 * The catalogue is offered as six buttons rather than left for the reader to
 * guess at, which is what the controller's own comment asks for — "so a client
 * can offer the six as buttons rather than making everybody guess what the box
 * understands". A button fills the question box rather than submitting it: the
 * ask costs credits, so the press that spends them is always the reader's own.
 */

const ASK_PERMISSION = "inventory:ai:read" as const;

function CatalogButtons({
  reports,
  onPick,
}: {
  reports: InvReportCatalogEntry[];
  onPick: (report: InvReportCatalogEntry) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {reports.map((report) => (
        <Button
          key={report.id}
          type="button"
          variant="outline"
          size="sm"
          title={report.description}
          onClick={() => onPick(report)}
        >
          {report.label}
        </Button>
      ))}
    </div>
  );
}

export function ReportBuilderPanel() {
  const gate = usePermissionGate(ASK_PERMISSION);
  const catalog = useInvReportCatalog();
  const ask = useInvReportAsk();
  const exportCsv = useInvReportExport();
  const [question, setQuestion] = useState("");

  const trimmed = question.trim();
  const tooShort = trimmed.length < INV_REPORT_QUESTION_MIN;

  const handleAsk = () => {
    if (tooShort) return;
    exportCsv.reset();
    ask.mutate({ question: trimmed });
  };

  /**
   * A catalogue button writes the question rather than sending it. The reader
   * can then edit it — "expiring lots" into "expiring lots at Pune" — and the
   * request that costs credits is still one they chose to make.
   */
  const handlePick = (report: InvReportCatalogEntry) => {
    setQuestion(report.description);
  };

  const handleQuestionChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuestion(event.target.value);
  };

  const handleExport = (spec: InvReportSpec) => {
    exportCsv.mutate(spec);
  };

  /**
   * `gate.denied` and not `!gate.allowed`. `useCan` is false both when the
   * answer is a refusal and while the access snapshot is still in flight, and a
   * screen that reads the second as the first tells a permitted reader they have
   * no access. Only a resolved refusal closes the surface; an unresolved one
   * leaves the box up and holds the button.
   */
  if (gate.denied) {
    return (
      <NoPermissionState
        permission={ASK_PERMISSION}
        title="Report builder hidden"
        description="You do not have access to the AI-assisted inventory surfaces."
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Card>
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <FileSpreadsheet className="h-3.5 w-3.5 text-primary" aria-hidden />
            Build a report from a question
            <AiGeneratedLabel />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-3">
          {catalog.isLoading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-8 w-32 rounded-md" />
              ))}
            </div>
          ) : catalog.isError ? (
            // The catalogue is the only read here, and losing it costs the six
            // buttons and nothing else — the box still works. Saying so beats a
            // full-page error over a surface that is still usable.
            <p className="text-dense text-muted-foreground" role="status">
              The report list could not be loaded ({getErrorMessage(catalog.error)}). You
              can still ask in your own words.
            </p>
          ) : catalog.data ? (
            <CatalogButtons reports={catalog.data.reports} onPick={handlePick} />
          ) : null}

          <Textarea
            value={question}
            onChange={handleQuestionChange}
            maxLength={INV_REPORT_QUESTION_MAX}
            rows={3}
            placeholder="What is below its reorder point? Which lots expire in the next month?"
            aria-label="Question to build a report from"
          />
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-micro text-muted-foreground">
              Every figure is computed by the inventory engine. The assistant only
              picks which of the six reports to run.
            </p>
            <LoadingButton
              type="button"
              size="sm"
              className="ml-auto"
              isPending={ask.isPending}
              loadingText="Building…"
              disabled={tooShort || !gate.allowed}
              onClick={handleAsk}
            >
              Build report
            </LoadingButton>
          </div>
        </CardContent>
      </Card>

      {ask.error ? (
        <ErrorState
          className="flex-1"
          title="Couldn't build that report"
          description={getErrorMessage(ask.error)}
          onRetry={handleAsk}
        />
      ) : ask.data ? (
        <Card className="flex min-h-0 flex-1 flex-col">
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-4">
            <ReportBuilderPreview
              preview={ask.data}
              onExport={handleExport}
              isExporting={exportCsv.isPending}
              exportError={exportCsv.error}
            />
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          className="flex-1 min-h-0"
          illustrationPreset="inventory"
          title="Ask for a report"
          description="Stock summary, reorder, movements, slow-moving, expiring lots and valuation — described in your own words, run against the warehouses you are assigned to."
        />
      )}
    </div>
  );
}
