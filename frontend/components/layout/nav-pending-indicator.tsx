"use client";

import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

interface NavPendingIndicatorProps {
  className?: string;
}

export function NavPendingIndicator({ className }: NavPendingIndicatorProps) {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden
      data-pending={pending ? "true" : "false"}
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 rounded-full bg-primary transition-transform duration-700 ease-out data-[pending=true]:scale-x-100",
        className,
      )}
    />
  );
}
