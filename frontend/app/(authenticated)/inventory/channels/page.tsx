"use client";

import { useState, useCallback, useMemo, Suspense } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, Info, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { EmptyOrdersIllustration } from "@/components/illustrations";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { SYNC_STATUS_BADGE, SYNC_STATUS_LABEL } from "@/features/inventory/lib";
import {
  useChannels,
  useSyncChannelStock,
  type Channel,
  type ChannelType,
} from "@/hooks/api/inventory/channels";
import { getErrorMessage } from "@/lib/get-error-message";
import { ChannelSheet } from "@/features/inventory/components/channels/channel-sheet";
import { ChannelPublicationsPanel } from "@/features/inventory/components/channels/channel-publications-panel";

const CHANNEL_TYPE_BADGE: Record<ChannelType, string> = {
  INTERNAL: "bg-slate-100 text-slate-700 border-slate-200",
  SHOPIFY: "bg-emerald-50 text-emerald-700 border-emerald-200",
  WOOCOMMERCE: "bg-blue-50 text-blue-700 border-blue-200",
  MARKETPLACE: "bg-amber-50 text-amber-700 border-amber-200",
  B2B: "bg-violet-50 text-violet-700 border-violet-200",
  THREE_PL: "bg-orange-50 text-orange-700 border-orange-200",
};

const CHANNEL_TYPE_LABEL: Record<ChannelType, string> = {
  INTERNAL: "Internal",
  SHOPIFY: "Shopify",
  WOOCOMMERCE: "WooCommerce",
  MARKETPLACE: "Marketplace",
  B2B: "B2B",
  THREE_PL: "3PL",
};

const EXTERNAL_TYPES = new Set<ChannelType>(["SHOPIFY", "WOOCOMMERCE", "MARKETPLACE", "B2B", "THREE_PL"]);

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function ChannelCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-3 w-32" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-7 w-28" />
        </div>
      </CardContent>
    </Card>
  );
}

interface ChannelCardProps {
  channel: Channel;
  onEdit: (channel: Channel) => void;
  onViewPublications: (channel: Channel) => void;
}

function ChannelCard({ channel, onEdit, onViewPublications }: ChannelCardProps) {
  const syncMutation = useSyncChannelStock();
  const isExternal = EXTERNAL_TYPES.has(channel.channelType);

  function handleSync(): void {
    syncMutation.mutate(channel.id, {
      onSuccess: () => toast.success("Stock sync triggered"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleEdit(): void {
    onEdit(channel);
  }

  function handleViewPublications(): void {
    onViewPublications(channel);
  }

  return (
    <motion.div variants={fadeUp}>
      <Card className="h-full">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm leading-tight">{channel.name}</p>
            <Badge
              variant="outline"
              className={cn(
                "text-[11px] shrink-0",
                channel.status === "ACTIVE"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-100 text-slate-700 border-slate-200",
              )}
            >
              {channel.status === "ACTIVE" ? "Active" : "Paused"}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant="outline"
              className={cn("text-[11px]", CHANNEL_TYPE_BADGE[channel.channelType])}
            >
              {CHANNEL_TYPE_LABEL[channel.channelType]}
            </Badge>

            {channel.lastSyncStatus && (
              <Badge
                variant="outline"
                className={cn("text-[11px]", SYNC_STATUS_BADGE[channel.lastSyncStatus])}
              >
                {SYNC_STATUS_LABEL[channel.lastSyncStatus]}
              </Badge>
            )}
          </div>

          {isExternal && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Info className="h-3 w-3 shrink-0" />
              <span>External sync requires provider connection</span>
            </div>
          )}

          <div className="space-y-0.5">
            <p className="text-[11px] text-muted-foreground">
              Last sync: {formatDate(channel.lastSyncAt)}
            </p>
            {channel.safetyBuffer != null && (
              <p className="text-[11px] text-muted-foreground">
                Safety buffer: {channel.safetyBuffer}%
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5"
              onClick={handleSync}
              disabled={syncMutation.isPending}
            >
              <RefreshCw className="h-3 w-3" />
              {syncMutation.isPending ? "Syncing…" : "Sync stock"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={handleEdit}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={handleViewPublications}
            >
              View publications
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ChannelsContent() {
  const { data, isLoading, isError, refetch } = useChannels();
  const channels = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const shouldReduceMotion = useReducedMotion();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editChannel, setEditChannel] = useState<Channel | undefined>(undefined);
  const [publicationsChannel, setPublicationsChannel] = useState<Channel | null>(null);
  const [publicationsPanelOpen, setPublicationsPanelOpen] = useState(false);

  const handleNewChannel = useCallback(() => {
    setEditChannel(undefined);
    setSheetOpen(true);
  }, []);

  const handleEdit = useCallback((channel: Channel) => {
    setEditChannel(channel);
    setSheetOpen(true);
  }, []);

  const handleViewPublications = useCallback((channel: Channel) => {
    setPublicationsChannel(channel);
    setPublicationsPanelOpen(true);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) setEditChannel(undefined);
  }, []);

  const handlePanelOpenChange = useCallback((open: boolean) => {
    setPublicationsPanelOpen(open);
    if (!open) setPublicationsChannel(null);
  }, []);

  function handleRetry(): void {
    void refetch();
  }

  const actions = (
    <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleNewChannel}>
      <Plus className="h-3.5 w-3.5" />
      New Channel
    </Button>
  );

  if (isLoading) {
    return (
      <PageWrapper eyebrow="Inventory · Channels" title="Channels" actions={actions}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <ChannelCardSkeleton key={i} />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper eyebrow="Inventory · Channels" title="Channels" actions={actions}>
        <ErrorState
          title="Failed to load channels"
          description="An error occurred while fetching channel data."
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        eyebrow="Inventory · Channels"
        title="Channels"
        subtitle={`${channels.length} ${channels.length === 1 ? "channel" : "channels"}`}
        badge={String(channels.length)}
        actions={actions}
      >
        {channels.length > 0 ? (
          <motion.div
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            variants={shouldReduceMotion ? undefined : staggerContainer}
            initial={shouldReduceMotion ? undefined : "hidden"}
            animate={shouldReduceMotion ? undefined : "visible"}
          >
            {channels.map((ch) => (
              <ChannelCard
                key={ch.id}
                channel={ch}
                onEdit={handleEdit}
                onViewPublications={handleViewPublications}
              />
            ))}
          </motion.div>
        ) : (
          <EmptyState
            illustration={<EmptyOrdersIllustration />}
            title="No channels yet"
            description="Create your first sales or fulfilment channel to start publishing stock."
            action={{ label: "New Channel", onClick: handleNewChannel }}
          />
        )}
      </PageWrapper>

      <ChannelSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        channel={editChannel}
      />
      <ChannelPublicationsPanel
        open={publicationsPanelOpen}
        onOpenChange={handlePanelOpenChange}
        channel={publicationsChannel}
      />
    </>
  );
}

export default function ChannelsPage() {
  return (
    <Suspense>
      <ChannelsContent />
    </Suspense>
  );
}
