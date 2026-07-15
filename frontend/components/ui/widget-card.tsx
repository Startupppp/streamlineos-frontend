"use client";

import * as React from "react";
import Link from "next/link";
import { ExternalLink, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Skeleton } from "./skeleton";
import { Badge } from "./badge";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";

interface WidgetCardProps {
  icon?: LucideIcon;
  iconClassName?: string;
  title: React.ReactNode;
  badge?: React.ReactNode;
  link?: { href: string; label?: string; ariaLabel?: string };
  action?: React.ReactNode;
  isLoading?: boolean;
  error?: unknown;
  errorMessage?: string;
  isEmpty?: boolean;
  empty?: React.ReactNode;
  loadingRows?: number;
  className?: string;
  contentClassName?: string;
  children?: React.ReactNode;
}

export function WidgetCard({
  icon: Icon,
  iconClassName,
  title,
  badge,
  link,
  action,
  isLoading,
  error,
  errorMessage,
  isEmpty,
  empty,
  loadingRows = 3,
  className,
  contentClassName,
  children,
}: WidgetCardProps) {
  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && (
            <Icon
              className={cn("h-4 w-4 text-muted-foreground shrink-0", iconClassName)}
              aria-hidden="true"
            />
          )}
          <CardTitle className="text-sm font-semibold truncate">{title}</CardTitle>
          {badge && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 shrink-0">
              {badge}
            </Badge>
          )}
        </div>
        {action ?? (
          link && (
            <Link
              href={link.href}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors shrink-0"
              aria-label={link.ariaLabel ?? link.label ?? "View more"}
            >
              {link.label && <span>{link.label}</span>}
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </Link>
          )
        )}
      </CardHeader>
      <CardContent className={cn("flex-1 min-h-0", contentClassName)}>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: loadingRows }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{errorMessage ?? getErrorMessage(error)}</p>
        ) : isEmpty ? (
          empty
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
