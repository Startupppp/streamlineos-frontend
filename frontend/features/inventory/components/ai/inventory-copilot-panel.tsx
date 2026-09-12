"use client";

import { useState } from "react";
import { Sparkles, TriangleAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { AiGeneratedLabel } from "@/components/ai/ai-generated-label";
import { AiUsageChip } from "@/components/ai/ai-usage-chip";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useInventoryCopilotAsk,
  type InvCopilotAnswer,
  type InvCopilotToolResult,
} from "@/hooks/api/inventory/ai";

/**
 * F2 — the inventory copilot.
 *
 * Every number on this screen was computed by the inventory engine and arrived
 * as a row from one of seven allowlisted reads. The prose above the tables is
 * the model narrating those rows, and it is rendered *after* them in the
 * markup's meaning if not its order: when the provider is unreachable the
 * tables render alone and the page is still worth having, which is the whole
 * reason retrieval and narration are separate calls.
 *
 * Nothing here can perform an action. There is no confirm, no link that
 * mutates, no button that writes — the copilot reads.
 */

/**
 * Columns are server-supplied and change per tool, so the header labels are
 * derived from the key rather than hard-coded. A camelCase key becomes spaced
 * words; that is the whole transformation, and it means a new column on the
 * server does not need a matching edit here.
 */
function headerLabel(column: string): string {
  const spaced = column.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Right-align anything that reads as a figure so columns do not jitter. */
const NUMERIC_COLUMNS = new Set([
  "onHand",
  "committed",
  "available",
  "reservedQty",
  "change",
  "balanceAfter",
  "daysLate",
]);

function ToolSection({ tool }: { tool: InvCopilotToolResult }) {
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">{tool.label}</h3>
        <Badge variant="outline" className="text-micro tabular-nums">
          {tool.rowCount} row{tool.rowCount === 1 ? "" : "s"}
        </Badge>
        {tool.truncated ? (
          // A capped result is a sample, and saying so is the difference between
          // "these are the late orders" and "these are some of them".
          <Badge variant="outline" className="text-micro">
            Showing the first {tool.rowCount}
          </Badge>
        ) : null}
      </div>

      {tool.rowCount === 0 ? (
        <p className="text-dense text-muted-foreground">
          Nothing matched in the warehouses you can see.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                {tool.columns.map((column) => (
                  <TableHead
                    key={column}
                    className={NUMERIC_COLUMNS.has(column) ? "text-right" : undefined}
                  >
                    {headerLabel(column)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tool.rows.map((row, index) => (
                <TableRow key={`${tool.tool}-${index}`}>
                  {tool.columns.map((column) => {
                    const value = row[column];
                    const numeric = NUMERIC_COLUMNS.has(column);
                    return (
                      <TableCell
                        key={column}
                        className={
                          numeric
                            ? "text-right font-mono tabular-nums"
                            : "max-w-xs truncate"
                        }
                      >
                        {value === null || value === undefined ? "—" : String(value)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

function AnswerBody({ answer }: { answer: InvCopilotAnswer }) {
  if (answer.status === "no_context") {
    return (
      <EmptyState
        className="flex-1 min-h-0"
        illustrationPreset="inventory"
        title="No matching records"
        description="Nothing in the warehouses you can see answers that. Try a different question, or check that the record you are asking about belongs to this organisation."
      />
    );
  }

  return (
    <div className="space-y-4">
      {answer.status === "facts_only" ? (
        // The provider is down. Saying so beside the tables is honest; hiding
        // the tables because the sentence failed would throw away the half that
        // was never in doubt.
        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3">
          <TriangleAlert
            className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="text-dense text-muted-foreground">
            The assistant could not be reached, so there is no written summary.
            The figures below were computed by the inventory engine and are
            current.
          </p>
        </div>
      ) : null}

      {answer.narration ? (
        <p className="max-w-3xl text-sm leading-relaxed text-foreground">
          {answer.narration}
        </p>
      ) : null}

      {answer.tools.map((tool) => (
        <ToolSection key={tool.tool} tool={tool} />
      ))}

      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
        <span className="text-micro text-muted-foreground">
          {answer.evidence.length} record{answer.evidence.length === 1 ? "" : "s"} cited
          · read {new Date(answer.generatedAt).toLocaleString()}
          {answer.provenance ? ` · narrated by ${answer.provenance.model}` : ""}
        </span>
        <AiUsageChip usage={answer.aiUsage ?? null} className="ml-auto" />
      </div>
    </div>
  );
}

export function InventoryCopilotPanel() {
  const canAsk = useCan("inventory:ai:read");
  const [question, setQuestion] = useState("");
  const ask = useInventoryCopilotAsk();

  const trimmed = question.trim();
  const handleSubmit = () => {
    if (trimmed.length < 3) return;
    ask.mutate({ question: trimmed });
  };

  if (!canAsk) {
    return (
      <NoPermissionState
        permission="inventory:ai:read"
        title="Copilot hidden"
        description="You do not have access to the AI-assisted inventory surfaces."
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Card>
        <CardHeader className="border-b border-border/60 pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Ask about your stock
            <AiGeneratedLabel />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-3">
          <Textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Which lots expire in the next month? Why is SKU-204 short at Pune?"
            aria-label="Question about inventory"
          />
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-micro text-muted-foreground">
              Answers are read-only and every figure comes from the inventory
              engine, not the model.
            </p>
            <LoadingButton
              type="button"
              size="sm"
              className="ml-auto"
              isPending={ask.isPending}
              loadingText="Reading…"
              disabled={trimmed.length < 3}
              onClick={handleSubmit}
            >
              Ask
            </LoadingButton>
          </div>
        </CardContent>
      </Card>

      {ask.error ? (
        <ErrorState
          className="flex-1"
          title="Couldn't answer that"
          description={getErrorMessage(ask.error)}
          onRetry={handleSubmit}
        />
      ) : ask.data ? (
        <Card className="flex min-h-0 flex-1 flex-col">
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-4">
            <AnswerBody answer={ask.data} />
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          className="flex-1 min-h-0"
          illustrationPreset="inventory"
          title="Ask a question"
          description="The copilot reads current stock, availability, movements, open purchase orders, reservations, expiring lots and supplier delays — only in the warehouses you are assigned to."
        />
      )}
    </div>
  );
}
