"use client";

import { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCorrelationId } from "@/lib/api-envelope";
import { cn } from "@/lib/utils";

interface ErrorReferenceProps {
  error: unknown;
  className?: string;
}

/**
 * The request id of a failed call, with a copy control, so a person can quote it to support and support can
 * find the request. The backend echoes the id it was sent as `correlationId` on every error envelope and
 * `getCorrelationId` reads it off the `ApiError`. Renders nothing for an error that carries none (a network
 * failure, a thrown string), so it is safe to drop under any error message.
 */
export function ErrorReference({ error, className }: ErrorReferenceProps) {
  const reference = getCorrelationId(error);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (reference === undefined) return;
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused (insecure context, permissions); the id stays on screen and selectable.
    }
  }, [reference]);

  if (reference === undefined) return null;

  return (
    <div className={cn("flex items-center justify-center gap-2 text-xs text-muted-foreground", className)}>
      <span>Reference</span>
      <code className="select-all rounded-md bg-muted px-1.5 py-0.5 font-mono text-foreground">{reference}</code>
      <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={handleCopy}>
        {copied ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
