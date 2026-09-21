"use client";

import { useSanitizedHtml } from "@/hooks/common/use-sanitized-html";
import type { SanitizeHtmlPolicy } from "@/lib/sanitize-html";
import { cn } from "@/lib/utils";

interface SanitizedHtmlProps {
  html: string;
  className?: string;
  policy?: SanitizeHtmlPolicy;
}

export function SanitizedHtml({ html, className, policy }: SanitizedHtmlProps) {
  const sanitized = useSanitizedHtml(html, policy);
  return (
    <div
      className={cn(className)}
      dangerouslySetInnerHTML={{ __html: sanitized ?? "" }}
    />
  );
}
