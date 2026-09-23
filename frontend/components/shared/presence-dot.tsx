"use client";

import { cn, resolveImageUrl } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { presenceDotClass, type PresenceStatus } from "@/lib/presence";

interface PresenceDotProps {
  status?: PresenceStatus;
  className?: string;
}

export function PresenceDot({ status, className }: PresenceDotProps) {
  if (status === undefined) return null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block rounded-full border-2 border-background",
        presenceDotClass(status),
        className,
      )}
    />
  );
}

interface AvatarWithPresenceProps {
  src?: string | null;
  fallback: string;
  status?: PresenceStatus;
  avatarClassName?: string;
  dotClassName?: string;
  alt?: string;
}

export function AvatarWithPresence({
  src,
  fallback,
  status,
  avatarClassName,
  dotClassName,
  alt,
}: AvatarWithPresenceProps) {
  return (
    <div className="relative shrink-0">
      <Avatar className={avatarClassName}>
        <AvatarImage src={resolveImageUrl(src)} alt={alt} />
        <AvatarFallback className="text-micro font-semibold">
          {fallback}
        </AvatarFallback>
      </Avatar>
      {status !== undefined ? (
        <PresenceDot
          status={status}
          className={cn("absolute -bottom-0.5 -right-0.5 size-2", dotClassName)}
        />
      ) : null}
    </div>
  );
}
