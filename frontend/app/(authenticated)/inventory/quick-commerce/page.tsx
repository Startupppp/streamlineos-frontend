"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Upload } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyOrdersIllustration } from "@/components/illustrations";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import {
  usePlatformPurchaseOrders,
  type PlatformPoStatus,
  type PlatformPoSummary,
} from "@/hooks/api/inventory/quick-commerce";
import { PlatformPoPanel } from "@/features/inventory/components/quick-commerce/platform-po-panel";
import { PayoutUploadSheet } from "@/features/inventory/components/quick-commerce/payout-upload-sheet";

const STATUS_BADGE: Record<PlatformPoStatus, string> = {
  RECEIVED: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  ACCEPTED: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  REJECTED: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABEL: Record<PlatformPoStatus, string> = {
  RECEIVED: "Received",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

function formatDate(iso: string | null): string {
  if (!iso) return "Not stated";
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function PoCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}

function QuickCommerceContent() {
  const canView = useCan("inventory:channels:manage");
  const { data, isLoading, isError, refetch } = usePlatformPurchaseOrders();
  const orders = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const shouldReduceMotion = useReducedMotion();

  const [selected, setSelected] = useState<PlatformPoSummary | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [payoutOpen, setPayoutOpen] = useState(false);

  const handleOpen = useCallback((order: PlatformPoSummary) => {
    setSelected(order);
    setPanelOpen(true);
  }, []);

  const handlePanelOpenChange = useCallback((open: boolean) => {
    setPanelOpen(open);
    if (!open) setSelected(null);
  }, []);

  const handleUploadPayout = useCallback(() => setPayoutOpen(true), []);

  function handleRetry(): void {
    void refetch();
  }

  const actions = (
    <Button variant="outline" onClick={handleUploadPayout}>
      <Upload className="h-3.5 w-3.5" />
      Upload payout file
    </Button>
  );

  if (!canView) {
    return (
      <PageWrapper title="Quick commerce">
        <NoPermissionState permission="inventory:channels:manage" className="flex-1" />
      </PageWrapper>
    );
  }

  if (isLoading) {
    return (
      <PageWrapper title="Quick commerce" actions={actions}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <PoCardSkeleton key={i} />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Quick commerce" actions={actions}>
        <ErrorState
          title="Failed to load platform purchase orders"
          description="An error occurred while fetching orders ingested from Blinkit, Instamart and Zepto."
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        title="Quick commerce"
        subtitle="Purchase orders raised on you by Blinkit, Instamart and Zepto"
        actions={actions}
      >
        {orders.length > 0 ? (
          <motion.div
            className="flex-1 min-h-0 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 content-start"
            variants={shouldReduceMotion ? undefined : staggerContainer}
            initial={shouldReduceMotion ? undefined : "hidden"}
            animate={shouldReduceMotion ? undefined : "visible"}
          >
            {orders.map((order) => (
              <motion.div key={order.id} variants={fadeUp}>
                <Card className="h-full">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm leading-tight truncate">
                          {order.providerPoNumber}
                        </p>
                        <p className="text-dense text-muted-foreground">{order.provider}</p>
                      </div>
                      <Badge variant="outline" className={cn("text-dense shrink-0", STATUS_BADGE[order.status])}>
                        {STATUS_LABEL[order.status]}
                      </Badge>
                    </div>

                    <div className="space-y-0.5">
                      <p className="text-dense text-muted-foreground">
                        Deliver by: {formatDate(order.expectedDeliveryDate)}
                      </p>
                      {order.destinationRef && (
                        <p className="text-dense text-muted-foreground">
                          Node: {order.destinationRef}
                        </p>
                      )}
                    </div>

                    {order.rejectionReason && (
                      <p className="text-dense text-status-danger-ink">{order.rejectionReason}</p>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => handleOpen(order)}
                    >
                      Open
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <InventoryEmptyState
            illustration={<EmptyOrdersIllustration />}
            title="No platform purchase orders yet"
            description="Orders ingested from Blinkit, Instamart or Zepto appear here. The quick-commerce pack must be switched on in inventory settings first."
          />
        )}
      </PageWrapper>

      <PlatformPoPanel
        open={panelOpen}
        onOpenChange={handlePanelOpenChange}
        platformPoId={selected?.id ?? null}
      />
      <PayoutUploadSheet open={payoutOpen} onOpenChange={setPayoutOpen} />
    </>
  );
}

export default function QuickCommercePage() {
  return (
    <Suspense>
      <QuickCommerceContent />
    </Suspense>
  );
}
