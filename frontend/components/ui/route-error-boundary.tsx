"use client";

import { useCallback, useId } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
interface RouteErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
  onBeforeReset?: () => void;
  title?: string;
  fallbackMessage?: string;
  layout?: "centered" | "inline" | "fullscreen";
}

export function RouteErrorBoundary({
  error: _,
  reset,
  onBeforeReset,
  title = "Something went wrong",
  fallbackMessage = "An unexpected error occurred. Please try again.",
  layout = "inline",
}: RouteErrorBoundaryProps) {
  const displayMessage = fallbackMessage;
  const headingId = useId();
  const isWholePage = layout === "fullscreen";

  const handleRetry = useCallback(() => {
    onBeforeReset?.();
    reset();
  }, [onBeforeReset, reset]);

  const content = (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-4 text-center"
    >
      <div className="bg-destructive/10 p-4 rounded-full">
        <AlertTriangle
          className="w-8 text-destructive"
          aria-hidden="true"
        />
      </div>
      <h1 id={headingId} className="text-xl font-bold text-foreground">
        {title}
      </h1>
      <p className="text-sm text-muted-foreground max-w-md">{displayMessage}</p>
      <Button onClick={handleRetry} variant="outline">
        <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
        Try Again
      </Button>
    </div>
  );

  /**
   * Every one of the 175 route `error.tsx` files replaces its segment's whole
   * body, and the page heading lives in `PageWrapper` inside that body — no
   * layout supplies one. So a boundary always owns the `h1`; the document had
   * none at all while this rendered an `h2`.
   *
   * `main` is different. Fullscreen means the boundary replaced the shell too,
   * so it must supply the landmark the shell would have; inline and centred sit
   * inside the shell's `main` and must not claim a second one.
   */
  if (isWholePage)
    return (
      <main
        aria-labelledby={headingId}
        className="min-h-dvh w-full noir-mesh flex items-center justify-center p-4"
      >
        <div className="max-w-md">{content}</div>
      </main>
    );

  if (layout === "centered")
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center py-10">
        {content}
      </div>
    );

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-12">
      {content}
    </div>
  );
}
