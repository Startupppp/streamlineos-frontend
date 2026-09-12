"use client";

import { useState } from "react";
import { LineChart, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { AiGeneratedLabel } from "@/components/ai/ai-generated-label";
import { AiUsageChip } from "@/components/ai/ai-usage-chip";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useInventoryDemandRisk,
  type InvDemandRiskResult,
} from "@/hooks/api/inventory/ai-review";
import { AiAnswerFeedback } from "./ai-answer-feedback";

/**
 * F3 — the demand-risk narrative.
 *
 * Every figure on this card was computed by the forecasting engine and stored;
 * the prose is a narration of those numbers and nothing else. That split is why
 * the layout puts the coverage window and the uncertainty *above* the sentence
 * rather than below it: the reader should see what the forecast covers before
 * they read what somebody says about it.
 *
 * Three states, rendered as three things:
 *
 *   * **an answer** — coverage, horizon, uncertainty and prose;
 *   * **facts only** — the provider is unreachable and the stored forecast is
 *     shown alone, because it is still the organisation's best estimate;
 *   * **insufficient evidence** — there is no stored forecast to narrate. That
 *     is a different claim from "no risk found" and must never render as one.
 *
 * There is no button here that computes a forecast. Commissioning one is a
 * decision with a horizon and a service level in it, and it belongs on the
 * forecasting screen, not behind a narration.
 */

function Figure({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-micro text-muted-foreground">{label}</p>
      <p className="text-dense font-mono tabular-nums text-foreground">{value}</p>
      {hint ? <p className="text-micro text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function CoverageStrip({ result }: { result: InvDemandRiskResult }) {
  const coverage = result.coverage;
  const uncertainty = result.uncertainty;
  if (!coverage || !uncertainty) return null;

  return (
    <div className="space-y-3 rounded-md border border-border bg-muted/40 p-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Figure
          label="Fitted over"
          value={`${coverage.from} → ${coverage.to}`}
          hint={`${coverage.periods} periods, ${coverage.historyWeeks} weeks of history`}
        />
        <Figure
          label="Speaks to"
          value={`${coverage.horizonWeeks} weeks ahead`}
          hint={uncertainty.method ? `method: ${uncertainty.method}` : "no champion method"}
        />
        <Figure
          label="Service level"
          value={uncertainty.serviceLevel}
          hint={uncertainty.z ? `z = ${uncertainty.z}` : undefined}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Figure label="Weekly demand" value={uncertainty.demandMean} />
        <Figure label="Std deviation" value={uncertainty.demandStdDev} />
        <Figure label="MAE" value={uncertainty.mae ?? "—"} />
        <Figure
          label="MASE"
          value={uncertainty.mase ?? "—"}
          hint={uncertainty.mase ? "1.0 = no better than naive" : undefined}
        />
      </div>

      {!uncertainty.applicable ? (
        // A refusal is a *result*. Rendering it as an absent number would turn
        // "we decline to model this demand" into "no risk found".
        <p className="text-dense text-status-warning-ink">
          The safety-stock model does not describe this demand:{" "}
          {uncertainty.refusalReason ?? "no reason recorded"}.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <Figure label="Safety stock" value={uncertainty.safetyStock ?? "—"} />
          <Figure label="Reorder point" value={uncertainty.reorderPoint ?? "—"} />
          <Figure label="Lead-time demand" value={uncertainty.leadTimeDemand ?? "—"} />
        </div>
      )}

      {uncertainty.stockoutCensored ? (
        <p className="text-dense text-status-warning-ink">
          {uncertainty.censoringNote ??
            `${uncertainty.censoredPeriods} periods closed with nothing on hand, so every figure here understates real demand.`}
        </p>
      ) : null}

      {uncertainty.shapeNote ? (
        <p className="text-micro text-muted-foreground">{uncertainty.shapeNote}</p>
      ) : null}
    </div>
  );
}

export function DemandRiskPanel() {
  const canRead = useCan("inventory:ai:read");
  const [variantId, setVariantId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const explain = useInventoryDemandRisk();

  if (!canRead) {
    return (
      <NoPermissionState
        permission="inventory:ai:read"
        title="Demand risk hidden"
        description="The AI-assisted inventory surfaces need their own read permission."
      />
    );
  }

  const parsedVariant = Number.parseInt(variantId, 10);
  const parsedWarehouse = Number.parseInt(warehouseId, 10);
  const canSubmit = Number.isInteger(parsedVariant) && parsedVariant > 0;

  function handleSubmit(): void {
    if (!canSubmit) return;
    explain.mutate({
      variantId: parsedVariant,
      ...(Number.isInteger(parsedWarehouse) && parsedWarehouse > 0
        ? { warehouseId: parsedWarehouse }
        : {}),
    });
  }

  const result = explain.data;

  return (
    <Card>
      <CardHeader className="border-b border-border/60 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <LineChart className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          Demand risk
          <AiGeneratedLabel />
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 pt-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="demand-risk-variant" className="text-micro">
              Product variant
            </Label>
            <Input
              id="demand-risk-variant"
              inputMode="numeric"
              className="w-40"
              value={variantId}
              onChange={(event) => setVariantId(event.target.value)}
              placeholder="Variant id"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="demand-risk-warehouse" className="text-micro">
              Warehouse (optional)
            </Label>
            <Input
              id="demand-risk-warehouse"
              inputMode="numeric"
              className="w-40"
              value={warehouseId}
              onChange={(event) => setWarehouseId(event.target.value)}
              placeholder="Warehouse id"
            />
          </div>
          <LoadingButton
            type="button"
            size="sm"
            isPending={explain.isPending}
            loadingText="Reading the forecast…"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            Explain the risk
          </LoadingButton>
        </div>

        <p className="text-micro text-muted-foreground">
          Narrates a forecast the engine has already stored. It cannot compute one, and
          every number below is the engine&rsquo;s rather than the model&rsquo;s.
        </p>

        {explain.error ? (
          <ErrorState
            title="Couldn't explain that"
            description={getErrorMessage(explain.error)}
            onRetry={handleSubmit}
          />
        ) : !result ? (
          <EmptyState
            illustrationPreset="inventory"
            title="Pick a variant"
            description="The narrative reads the stored forecast for one variant, in one warehouse or across the organisation, and explains what it implies and how confident it permits you to be."
          />
        ) : result.status === "insufficient_evidence" ? (
          <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
            <p className="text-dense font-semibold text-foreground">
              Not enough evidence to answer
            </p>
            <ul className="list-inside list-disc space-y-1">
              {result.missing.map((item) => (
                <li key={item} className="text-dense text-muted-foreground">
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-micro text-muted-foreground">
              This is not &ldquo;no demand risk&rdquo;. It means there is no stored
              forecast to narrate — run one on the forecasting screen first.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {result.status === "facts_only" ? (
              <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-3">
                <TriangleAlert
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="text-dense text-muted-foreground">
                  The assistant could not be reached, so there is no written summary.
                  The forecast below was computed by the engine and is unchanged.
                </p>
              </div>
            ) : null}

            <CoverageStrip result={result} />

            {result.narration ? (
              <p className="max-w-3xl text-sm leading-relaxed text-foreground">
                {result.narration}
              </p>
            ) : null}

            {result.factors.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {result.factors.map((factor) => (
                  <Badge
                    key={`${factor.label}-${factor.value}`}
                    variant="outline"
                    className="text-micro"
                  >
                    {/* A measured figure and a written suggestion must not wear the
                        same styling — collapsing them is how a generated number
                        gets read as a computed one. */}
                    {factor.isFactual ? "" : "suggestion · "}
                    {factor.label}: {factor.value}
                  </Badge>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
              <span className="text-micro text-muted-foreground">
                Forecast #{result.forecastId ?? "—"}
                {result.forecastGeneratedAt
                  ? ` generated ${new Date(result.forecastGeneratedAt).toLocaleString()}`
                  : ""}
                {result.provenance ? ` · narrated by ${result.provenance.model}` : ""}
              </span>
              <AiUsageChip usage={result.aiUsage ?? null} className="ml-auto" />
            </div>

            <AiAnswerFeedback surface="demand_risk" provenance={result.provenance} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
