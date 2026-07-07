"use client";

import Link from "next/link";
import { BookOpen, Home, RotateCcw, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StateIllustration } from "@/components/illustrations/state-illustration";
import { isApiError } from "@/lib/api-client";

interface KbPageNotFoundProps {
  error: unknown;
  onRetry: () => void;
}

function resolveVariant(error: unknown): "not-found" | "access-denied" | "error" {
  if (isApiError(error)) {
    if (error.status === 404) return "not-found";
    if (error.status === 403) return "access-denied";
  }
  return "error";
}

const VARIANTS = {
  "not-found": {
    title: "Page not found",
    description:
      "This page may have been deleted, moved, or the link may be incorrect. Check the trash if you think it was recently removed.",
  },
  "access-denied": {
    title: "You don't have access",
    description:
      "You don't have permission to view this page. Contact the page owner or a workspace admin to request access.",
  },
  error: {
    title: "Couldn't load this page",
    description:
      "Something went wrong while loading this page. This is usually temporary — try refreshing or go back to the knowledge base.",
  },
};

export function KbPageNotFound({ error, onRetry }: KbPageNotFoundProps) {
  const variant = resolveVariant(error);
  const { title, description } = VARIANTS[variant];

  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <StateIllustration preset="knowledge" className="h-32 w-32 mb-6 opacity-80" />

      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {variant === "error" && (
          <Button onClick={onRetry} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Try again
          </Button>
        )}

        <Button
          asChild
          variant={variant === "error" ? "outline" : "default"}
          className="gap-2"
        >
          <Link href="/knowledge">
            <Home className="h-4 w-4" />
            Knowledge home
          </Link>
        </Button>

        <Button asChild variant="outline" className="gap-2">
          <Link href="/knowledge/recent">
            <BookOpen className="h-4 w-4" />
            Recent pages
          </Link>
        </Button>

        {variant === "not-found" && (
          <Button asChild variant="ghost" className="gap-2 text-muted-foreground">
            <Link href="/knowledge/trash">
              <Trash2 className="h-4 w-4" />
              Check trash
            </Link>
          </Button>
        )}

        {variant === "access-denied" && (
          <Button asChild variant="ghost" className="gap-2 text-muted-foreground">
            <Link href="/knowledge/spaces">
              <Search className="h-4 w-4" />
              Browse spaces
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
