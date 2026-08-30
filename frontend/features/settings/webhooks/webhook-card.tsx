"use client";

import { useCallback } from "react";
import { ToggleLeft, ToggleRight, Activity } from "lucide-react";
import { CopyIcon, KeyRoundIcon, Trash2Icon } from "@animateicons/react/lucide";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useMotionVariants } from "@/lib/motion-variants";
import type { WebhookEndpoint } from "@/hooks/api/webhooks";

export interface WebhookCardProps {
  webhook: WebhookEndpoint;
  onCopyUrl: (url: string) => void;
  onToggle: (id: number, isActive: boolean) => void;
  onDelete: (id: number) => void;
  onRotateSecret: (id: number) => void;
  onViewLogs: (webhook: WebhookEndpoint) => void;
  canManage: boolean;
}

function CopyUrlButton({ onCopy }: { onCopy: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button onClick={onCopy} aria-label="Copy URL" {...hoverHandlers}>
      <CopyIcon
        ref={iconRef}
        size={12}
        className="text-muted-foreground hover:text-foreground transition-colors"
      />
    </button>
  );
}

export function WebhookCard({
  webhook: wh,
  onCopyUrl,
  onToggle,
  onDelete,
  onRotateSecret,
  onViewLogs,
  canManage,
}: WebhookCardProps) {
  const { fadeUp } = useMotionVariants();
  const handleCopy = useCallback(() => onCopyUrl(wh.url), [wh.url, onCopyUrl]);
  const handleRotateClick = useCallback(
    () => onRotateSecret(wh.id),
    [wh.id, onRotateSecret],
  );
  const handleToggleClick = useCallback(
    () => onToggle(wh.id, wh.isActive),
    [wh.id, wh.isActive, onToggle],
  );
  const handleDeleteClick = useCallback(
    () => onDelete(wh.id),
    [wh.id, onDelete],
  );
  const handleViewLogs = useCallback(
    () => onViewLogs(wh),
    [wh, onViewLogs],
  );

  return (
    <motion.div variants={fadeUp}>
      <Card className="shadow-noir">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`h-2.5 w-2.5 rounded-full shrink-0 ${wh.isActive ? "bg-status-success-surface" : "bg-muted-foreground/40"}`}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm truncate">{wh.url}</CardTitle>
                  <CopyUrlButton onCopy={handleCopy} />
                </div>
                {wh.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {wh.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant={wh.isActive ? "default" : "secondary"}
                className="text-xs"
              >
                {wh.isActive ? "Active" : "Inactive"}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="w-7"
                onClick={handleViewLogs}
                aria-label="View delivery logs"
              >
                <Activity className="h-4 w-4 text-muted-foreground" />
              </Button>
              {canManage && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7"
                    onClick={handleToggleClick}
                    aria-label={wh.isActive ? "Disable webhook" : "Enable webhook"}
                  >
                    {wh.isActive ? (
                      <ToggleRight className="h-4 w-4 text-status-success-ink" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <AnimatedIconButton
                    icon={KeyRoundIcon}
                    iconSize={16}
                    variant="ghost"
                    size="icon"
                    className="w-7"
                    onClick={handleRotateClick}
                    aria-label="Rotate signing secret"
                  />
                  <AnimatedIconButton
                    icon={Trash2Icon}
                    iconSize={16}
                    variant="ghost"
                    size="icon"
                    className="w-7 text-destructive hover:text-destructive"
                    onClick={handleDeleteClick}
                    aria-label="Delete webhook"
                  />
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {(wh.events ?? []).length === 0 ? (
              <span className="text-xs text-muted-foreground">
                Receives all events
              </span>
            ) : (
              (wh.events ?? []).map((ev) => (
                <Badge key={ev} variant="secondary" className="text-micro">
                  {ev}
                </Badge>
              ))
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Created {new Date(wh.createdAt).toLocaleDateString("en-IN")}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function WebhookCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="h-2 w-2 shrink-0 rounded-full" />
            <Skeleton className="h-4 flex-1 max-w-[360px]" />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-9 rounded-full" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="mt-3 h-3 w-28" />
      </CardContent>
    </Card>
  );
}
