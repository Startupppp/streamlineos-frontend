"use client";

import { PlusIcon, XIcon, EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { PmPageShell, PM_PANEL } from "@/components/pm-chrome";
import { cn } from "@/lib/utils";

export function UnlinkProjectButton({
  projectName,
  projectId,
  isPending,
  onUnlink,
}: {
  projectName: string;
  projectId: number;
  isPending: boolean;
  onUnlink: (id: number) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  function handleClick() {
    onUnlink(projectId);
  }
  return (
    <Button
      variant="ghost"
      size="icon"
      className="w-7 shrink-0"
      onClick={handleClick}
      disabled={isPending}
      aria-label={`Unlink ${projectName}`}
      {...hoverHandlers}
    >
      <XIcon ref={iconRef} size={14} />
    </Button>
  );
}

export function LinkProjectButton({
  disabled,
  isPending,
  onClick,
}: {
  disabled: boolean;
  isPending: boolean;
  onClick: () => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <LoadingButton
      size="sm"
      className="gap-1 text-xs"
      onClick={onClick}
      disabled={disabled}
      isPending={isPending}
      loadingText="Linking…"
      {...hoverHandlers}
    >
      <PlusIcon ref={iconRef} size={12} /> Link
    </LoadingButton>
  );
}

export function PortfolioActionsButton() {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button variant="outline" {...hoverHandlers}>
      <EllipsisIcon ref={iconRef} size={14} /> Actions
    </Button>
  );
}

export function DetailSkeleton() {
  return (
    <PmPageShell>
      <div className={cn(PM_PANEL, "space-y-3 p-4")}>
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className={cn(PM_PANEL, "space-y-2 p-2")}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    </PmPageShell>
  );
}
