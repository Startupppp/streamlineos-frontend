"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HeightVariant = "compact" | "fill";

interface AiQuotaEmptyStateProps {
  variant?: HeightVariant;
  className?: string;
}

export function AiQuotaEmptyState({
  variant = "fill",
  className,
}: AiQuotaEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 text-center",
        variant === "fill" ? "min-h-full flex-1 py-12 px-6" : "py-4 px-3",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-muted",
          variant === "fill" ? "mb-2 h-10 w-10" : "mb-1 h-7 w-7",
        )}
      >
        <Sparkles
          className={cn(
            "text-muted-foreground",
            variant === "fill" ? "h-5 w-5" : "h-3.5 w-3.5",
          )}
          aria-hidden
        />
      </div>
      <p
        className={cn(
          "font-semibold text-foreground",
          variant === "fill" ? "text-sm" : "text-xs",
        )}
      >
        AI credits exhausted
      </p>
      <p
        className={cn(
          "text-muted-foreground",
          variant === "fill" ? "text-sm" : "text-dense",
        )}
      >
        Top up to continue using AI features.
      </p>
      <Button
        asChild
        size={variant === "fill" ? "default" : "sm"}
        className={cn(variant === "compact" && "mt-0.5 h-7 text-xs")}
      >
        <Link href="/settings/billing/ai-credits">Top up AI credits</Link>
      </Button>
    </div>
  );
}
