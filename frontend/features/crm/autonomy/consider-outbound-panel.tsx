"use client";

import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { useCan } from "@/hooks/api/access";
import { useComposeOutbound } from "@/hooks/api/crm/autonomy";
import { useDeals } from "@/hooks/api/crm/deals";
import { newIdempotencyKey } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import type { ComposeOutboundOutcome } from "@/types/crm/autonomy";
import { OUTBOUND_CLASS_LABELS, OUTBOUND_REFUSAL_STAGES } from "./outbound-outcome";

const DEAL_PAGE_LIMIT = 100;

export function ConsiderOutboundPanel() {
  const canCompose = useCan("crm:autonomy:manage");
  const deals = useDeals({ limit: DEAL_PAGE_LIMIT });
  const compose = useComposeOutbound();

  const [dealId, setDealId] = useState("");
  const [outcome, setOutcome] = useState<ComposeOutboundOutcome | null>(null);

  const composable = useMemo(
    () => (deals.data ?? []).filter((deal) => deal.partyId !== null),
    [deals.data],
  );
  const hiddenCount = (deals.data ?? []).length - composable.length;
  const selected = composable.find((deal) => String(deal.id) === dealId);

  if (!canCompose) return null;

  function handleConsider() {
    if (!selected?.partyId) return;
    setOutcome(null);
    compose.mutate(
      {
        partyId: selected.partyId,
        dealId: String(selected.id),
        intentKey: newIdempotencyKey(),
      },
      { onSuccess: setOutcome },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-gap-inline">
          <Send className="size-4" />
          Consider writing to a customer
        </CardTitle>
        <CardDescription>
          The system decides whether to write, what kind of message it is, and when it
          goes. You are asking it to look, not telling it to send.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-gap-field">
        {deals.access.denied ? (
          <p className="text-sm text-muted-foreground">
            Starting a message needs to read the deal it is about, and you do not have
            permission to read deals.
          </p>
        ) : deals.isLoading ? (
          <Skeleton className="h-9 w-full rounded-md" />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-gap-field">
              <Select value={dealId} onValueChange={setDealId}>
                <SelectTrigger aria-label="Deal to consider" className="w-full sm:w-80">
                  <SelectValue placeholder="Pick a deal" />
                </SelectTrigger>
                <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                  {composable.map((deal) => (
                    <SelectItem key={deal.id} value={String(deal.id)}>
                      {deal.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <LoadingButton
                isPending={compose.isPending}
                loadingText="Considering…"
                disabled={!selected}
                onClick={handleConsider}
              >
                Consider
              </LoadingButton>
            </div>

            {composable.length === 0 ? (
              <p className="text-label text-muted-foreground">
                None of your deals is linked to a customer record yet, so there is nobody
                for the system to write to.
              </p>
            ) : hiddenCount > 0 ? (
              <p className="text-label text-muted-foreground">
                {hiddenCount} {hiddenCount === 1 ? "deal is" : "deals are"} not shown: they
                are not linked to a customer record, so there is no one to write to.
              </p>
            ) : null}
          </>
        )}

        {compose.isError ? (
          <p role="alert" className="text-label text-status-danger-ink">
            {getErrorMessage(compose.error)}
          </p>
        ) : null}

        {outcome ? <OutboundOutcomeNotice outcome={outcome} /> : null}
      </CardContent>
    </Card>
  );
}

function OutboundOutcomeNotice({ outcome }: { outcome: ComposeOutboundOutcome }) {
  if (!outcome.held)
    return (
      <div
        role="status"
        className="rounded-lg border border-border bg-muted/40 p-3 text-sm"
      >
        <p className="font-medium">Nothing was sent, and nothing is waiting.</p>
        <p className="text-muted-foreground">{outcome.reason}</p>
        <p className="mt-1 text-micro text-muted-foreground">
          Stopped at: {OUTBOUND_REFUSAL_STAGES[outcome.stage]}
        </p>
      </div>
    );

  const minutes = Math.max(1, Math.round(outcome.windowSeconds / 60));

  return (
    <div role="status" className="rounded-lg border border-border bg-card p-3 text-sm">
      <p className="flex flex-wrap items-center gap-gap-inline font-medium">
        A message is waiting
        <Badge variant="outline">{OUTBOUND_CLASS_LABELS[outcome.outboundClass]}</Badge>
      </p>
      
      <p className="text-muted-foreground">
        It goes out in about {minutes} {minutes === 1 ? "minute" : "minutes"} unless
        somebody stops it. Stop it from the countdown at the top of this page.
      </p>
    </div>
  );
}
