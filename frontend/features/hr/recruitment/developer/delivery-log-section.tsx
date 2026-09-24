"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useSandboxDeliveries } from "@/hooks/api/hr/recruitment/developer-sandbox";

const STATUS_VARIANT: Record<string, "secondary" | "outline" | "destructive"> = {
  delivered: "secondary",
  pending: "outline",
  failed: "destructive",
  dead: "destructive",
};

/**
 * What actually left this deployment, with the receiver's own answer.
 *
 * The response status is the column that matters: a delivery can be `delivered`
 * from our side and a 500 on theirs, and a log that showed only our status
 * would let a broken receiver read as a working integration.
 */
export function DeliveryLogSection() {
  const { data: deliveries = [], isLoading } = useSandboxDeliveries();

  if (isLoading) return <Skeleton className="h-40 rounded-xl" />;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Recent hiring deliveries</h2>
      {deliveries.length === 0 ? (
        <EmptyState
          illustrationPreset="automations"
          title="No hiring webhooks sent yet"
          description="Deliveries appear here once a candidate moves, or when you replay an event against a subscription."
          compact
        />
      ) : (
        <div className="space-y-2">
          {deliveries.map((delivery) => (
            <Card key={delivery.deliveryId} className="shadow-sm">
              <CardHeader className="pb-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="font-mono text-xs font-semibold">
                    {delivery.event}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant={STATUS_VARIANT[delivery.status] ?? "outline"}
                      className="text-micro"
                    >
                      {delivery.status}
                    </Badge>
                    {delivery.responseStatus !== null && (
                      <Badge variant="outline" className="text-micro font-mono">
                        HTTP {delivery.responseStatus}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-micro">
                      attempt {delivery.attempts}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-1 text-xs text-muted-foreground">
                <p>
                  {delivery.subscriptionName} ·{" "}
                  {format(new Date(delivery.createdAt), "MMM d, HH:mm")}
                </p>
                {delivery.error && (
                  <p className="font-mono text-micro text-destructive">{delivery.error}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
