"use client";

import { useCallback, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCanState } from "@/hooks/api/access";
import { useHrWebhooks } from "@/hooks/api/hr/hr-webhooks";
import {
  useReplaySandboxEvent,
  useSandboxCatalogue,
} from "@/hooks/api/hr/recruitment/developer-sandbox";

/**
 * Fires one hiring event's sample body at a webhook the tenant already owns.
 *
 * It replaces the only previous way to test a hiring receiver, which was to
 * hire somebody. The server refuses an event the subscription is not subscribed
 * to and marks the body `replay: true`, so a test can never be mistaken for a
 * real hire by whatever is listening on the other end.
 */
export function ReplaySection() {
  /*
    FE-47. `useHrWebhooks` is gated on this key, and a disabled Query v5 read
    reports `isPending: true, isFetching: false` — so `isLoading` is false and
    the list is empty, which is indistinguishable from an organisation that has
    configured no webhooks. Without this check a denied viewer would be told
    "No webhooks configured" and go looking for a button they are not allowed
    to have.
  */
  const manageState = useCanState("hr:integrations:manage");
  const { data: subscriptions = [], isLoading } = useHrWebhooks({ limit: 50 });
  const { data: catalogue } = useSandboxCatalogue();
  const replay = useReplaySandboxEvent();

  const [subscriptionId, setSubscriptionId] = useState<string>("");
  const [event, setEvent] = useState<string>("");

  const handleSubscriptionChange = useCallback((value: string) => {
    setSubscriptionId(value);
  }, []);
  const handleEventChange = useCallback((value: string) => {
    setEvent(value);
  }, []);

  const handleReplay = useCallback(() => {
    const id = Number(subscriptionId);
    if (!Number.isInteger(id) || id <= 0 || event === "") {
      toast.error("Pick a webhook and an event first.");
      return;
    }
    replay.mutate(
      { subscriptionId: id, event },
      {
        onSuccess: () => toast.success("Queued. It will appear in the log below."),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [event, replay, subscriptionId]);

  if (manageState === "denied") return null;
  if (isLoading) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Replay an event</h2>
      {subscriptions.length === 0 ? (
        <EmptyState
          illustrationPreset="automations"
          title="No webhooks configured"
          description="Add a webhook subscription under HR settings, then come back to replay a hiring event against it."
          action={{ label: "Configure webhooks", href: "/hr/settings" }}
          compact
        />
      ) : (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Send a sample delivery</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="replay-subscription" className="text-xs">
                  Webhook
                </Label>
                <Select value={subscriptionId} onValueChange={handleSubscriptionChange}>
                  <SelectTrigger id="replay-subscription">
                    <SelectValue placeholder="Choose a webhook" />
                  </SelectTrigger>
                  <SelectContent>
                    {subscriptions.map((subscription) => (
                      <SelectItem key={subscription.id} value={String(subscription.id)}>
                        {subscription.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="replay-event" className="text-xs">
                  Event
                </Label>
                <Select value={event} onValueChange={handleEventChange}>
                  <SelectTrigger id="replay-event">
                    <SelectValue placeholder="Choose an event" />
                  </SelectTrigger>
                  <SelectContent>
                    {(catalogue?.events ?? []).map((catalogueEvent) => (
                      <SelectItem key={catalogueEvent.value} value={catalogueEvent.value}>
                        {catalogueEvent.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              The body is sent with <code className="font-mono">replay: true</code> so your receiver
              can tell it apart from a real hire.
            </p>
            <LoadingButton
              size="sm"
              onClick={handleReplay}
              isPending={replay.isPending}
              loadingText="Queueing..."
            >
              Replay
            </LoadingButton>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
