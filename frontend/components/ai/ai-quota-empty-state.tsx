"use client";

import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

type HeightVariant = "compact" | "fill";

interface AiQuotaEmptyStateProps {
  variant?: HeightVariant;
  className?: string;
}

function QuotaIcon({ variant }: { variant: HeightVariant }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-muted",
        variant === "fill" ? "h-10 w-10" : "h-7 w-7",
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
  );
}

export function AiQuotaEmptyState({
  variant = "fill",
  className,
}: AiQuotaEmptyStateProps) {
  return (
    <EmptyState
      bare
      compact={variant === "compact"}
      illustrationSize="xs"
      illustration={<QuotaIcon variant={variant} />}
      title="AI credits exhausted"
      description="Top up to continue using AI features."
      action={{ label: "Top up AI credits", href: "/settings/billing/ai-credits" }}
      actionVariant="default"
      className={cn(variant === "fill" && "min-h-full flex-1 py-12 px-6", className)}
    />
  );
}
