"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import {
  useGenerateWebhook,
  useWebhookEvents,
  useRetryWebhookEvent,
  usePaymentProviders,
  type PaymentEnvironment,
} from "@/hooks/api/payments";

export function WebhooksTab({ providerKey, environment }: { providerKey: string; environment: PaymentEnvironment }) {
  const { data: providers } = usePaymentProviders();
  const provider = providers?.find((p) => p.providerKey === providerKey);
  const generate = useGenerateWebhook(providerKey);
  const retry = useRetryWebhookEvent(providerKey);
  const { data: events, isLoading } = useWebhookEvents(providerKey);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  function handleGenerate() {
    generate.mutate(environment, {
      onSuccess: (endpoint) => {
        setGeneratedUrl(endpoint.url);
        toast.success("Webhook endpoint generated — add it to your provider's dashboard");
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleCopy(url: string) {
    navigator.clipboard.writeText(url).then(() => toast.success("Copied"));
  }

  const environmentEvents = (events ?? []).filter((e) => e.environment === environment);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
        <p className="text-[13px] font-medium text-foreground">
          {environment === "live" ? "Live" : "Test"} webhook endpoint
        </p>
        {generatedUrl ? (
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate text-[11px] bg-background border border-border rounded px-2 py-1.5 font-mono">
              {generatedUrl}
            </code>
            <Button size="icon" variant="outline" className="h-7 w-7 shrink-0" onClick={() => handleCopy(generatedUrl)}>
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Generate an endpoint URL, add it in your provider&apos;s dashboard, and paste the signing secret in
            Credentials. Verification happens automatically the first time a real event arrives.
          </p>
        )}
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleGenerate} disabled={generate.isPending}>
          <ShieldCheck className="h-3 w-3" />
          {generatedUrl ? "Regenerate" : "Generate endpoint"}
        </Button>
        {provider && (
          <p className="text-[11px] text-muted-foreground">
            Expected events: card/UPI payments authorized, captured, failed; refunds; subscription charges.
          </p>
        )}
      </div>

      <div>
        <p className="text-[13px] font-medium text-foreground mb-2">Recent events</p>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : environmentEvents.length === 0 ? (
          <EmptyState title="No webhook events yet" description="Events will appear here as they're received." compact />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Received</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {environmentEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="text-[12px] font-mono">{event.eventType}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "text-[11px] font-medium",
                        event.processingStatus === "failed" ? "text-rose-600" : "text-emerald-600",
                      )}
                    >
                      {event.processingStatus}
                    </span>
                  </TableCell>
                  <TableCell className="text-[11px] text-muted-foreground">
                    {new Date(event.receivedAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {event.processingStatus === "failed" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs gap-1"
                        onClick={() => retry.mutate(event.id, { onError: (err) => toast.error(getErrorMessage(err)) })}
                      >
                        <RefreshCw className="h-3 w-3" /> Retry
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
