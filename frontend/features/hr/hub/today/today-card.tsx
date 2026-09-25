"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserInitials } from "@/lib/person-display";
import { getErrorMessage } from "@/lib/get-error-message";
import { resolveImageUrl } from "@/lib/utils";

export function SkeletonRows() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-7 w-full rounded-lg" />
      <Skeleton className="h-7 w-5/6 rounded-lg" />
      <Skeleton className="h-7 w-4/6 rounded-lg" />
    </div>
  );
}

export function ErrorRetry({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="flex-1 text-muted-foreground truncate">
        {getErrorMessage(error)}
      </span>
      <Button
        type="button"
        variant="link"
        size="sm"
        onClick={onRetry}
        className="h-auto shrink-0 gap-1 p-0 text-xs text-status-info-ink"
      >
        <RefreshCcw className="h-3 w-3" />
        Retry
      </Button>
    </div>
  );
}

export function AvatarInitials({
  name,
  image,
}: {
  name: string;
  image: string | null | undefined;
}) {
  return (
    <Avatar className="h-6 w-6 shrink-0">
      <AvatarImage src={resolveImageUrl(image)} />
      <AvatarFallback className="text-micro">
        {getUserInitials({ name })}
      </AvatarFallback>
    </Avatar>
  );
}
