"use client";

import Image from "next/image";
import { Hash } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import { getInitials } from "./chat-helpers";

interface ChannelAvatarProps {
  type: string | undefined;
  name?: string | null;
  avatarUrl?: string | null;
  otherMember?: { name?: string | null; image?: string | null } | null;
  className?: string;
  iconClassName?: string;
  rounded?: "full" | "xl" | "2xl";
}

const ROUNDED: Record<NonNullable<ChannelAvatarProps["rounded"]>, string> = {
  full: "rounded-full",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
};

export function ChannelAvatar({
  type,
  name,
  avatarUrl,
  otherMember,
  className,
  iconClassName,
  rounded = "full",
}: ChannelAvatarProps) {
  const round = ROUNDED[rounded];

  if (type === "DIRECT") {
    return (
      <Avatar className={cn("border-2 border-background shadow-sm", round, className)}>
        <AvatarImage src={resolveImageUrl(otherMember?.image)} />
        <AvatarFallback
          className={cn(
            "text-[10px] font-semibold bg-gradient-to-br from-blue-500/20 to-blue-500/5 text-blue-600",
            round,
          )}
        >
          {getInitials(otherMember?.name)}
        </AvatarFallback>
      </Avatar>
    );
  }

  if (avatarUrl) {
    return (
      <div
        className={cn(
          "relative overflow-hidden border-2 border-background shadow-sm bg-muted",
          round,
          className,
        )}
      >
        <Image
          src={resolveImageUrl(avatarUrl) ?? ""}
          alt={name ?? "Channel"}
          fill
          unoptimized
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-gradient-to-br from-blue/10 to-blue/5 flex items-center justify-center border-2 border-background shadow-sm",
        round,
        className,
      )}
    >
      <Hash className={cn("text-blue", iconClassName ?? "h-4 w-4")} />
    </div>
  );
}
