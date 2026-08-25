"use client";

import { useCallback, useMemo, useState } from "react";
import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const BLOCKED_ATTR = "data-blocked-src";

const ALLOWED_TAGS = [
  "a", "abbr", "b", "blockquote", "br", "caption", "cite", "code", "col",
  "colgroup", "dd", "del", "dfn", "div", "dl", "dt", "em", "figcaption",
  "figure", "h1", "h2", "h3", "h4", "h5", "h6", "hr", "i", "img", "ins",
  "kbd", "li", "mark", "ol", "p", "pre", "q", "s", "samp", "small",
  "span", "strong", "sub", "sup", "table", "tbody", "td", "tfoot", "th",
  "thead", "time", "tr", "u", "ul", "var",
];

const ALLOWED_ATTR = [
  "align", "alt", "border", "cellpadding", "cellspacing", "class",
  "colspan", "height", "href", "rowspan", "src", "style", "target",
  "title", "valign", "width",
  BLOCKED_ATTR,
];

function isRemoteUrl(src: string): boolean {
  return src.startsWith("http://") || src.startsWith("https://") || src.startsWith("//");
}

function sanitizeEmail(html: string, allowImages: boolean): string {
  if (!allowImages) {
    DOMPurify.addHook("afterSanitizeAttributes", (node) => {
      if (node.tagName === "IMG") {
        const src = node.getAttribute("src") ?? "";
        if (isRemoteUrl(src)) {
          node.setAttribute(BLOCKED_ATTR, src);
          node.removeAttribute("src");
          const alt = node.getAttribute("alt") ?? "remote image";
          node.setAttribute("alt", alt);
        }
      }
    });
  }

  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORCE_BODY: true,
    ALLOW_UNKNOWN_PROTOCOLS: false,
  });

  DOMPurify.removeHook("afterSanitizeAttributes");

  return clean.replace(
    /<a(\s)/gi,
    '<a target="_blank" rel="noopener noreferrer"$1',
  );
}

function countBlockedImages(html: string): number {
  const matches = html.match(new RegExp(BLOCKED_ATTR, "g"));
  return matches?.length ?? 0;
}

interface MailHtmlViewerProps {
  html: string;
  className?: string;
}

export function MailHtmlViewer({ html, className }: MailHtmlViewerProps) {
  const [allowImages, setAllowImages] = useState(false);

  const sanitized = useMemo(
    () => sanitizeEmail(html, allowImages),
    [html, allowImages],
  );

  const blockedCount = useMemo(
    () => (allowImages ? 0 : countBlockedImages(sanitized)),
    [sanitized, allowImages],
  );

  const handleLoadImages = useCallback(() => setAllowImages(true), []);

  return (
    <div className={cn("min-w-0", className)}>
      {blockedCount > 0 && (
        <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-md bg-muted/60 border border-border/40 text-dense text-muted-foreground">
          <span>
            {blockedCount} remote image{blockedCount > 1 ? "s" : ""} blocked
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-dense px-2 text-primary hover:text-primary"
            onClick={handleLoadImages}
          >
            Load images
          </Button>
        </div>
      )}
      <div
        className="mail-html-frame overflow-x-auto rounded-lg border border-border/50 bg-white text-foreground shadow-sm"
        style={{ colorScheme: "light" }}
      >
        <div
          className="mail-html-body prose prose-sm max-w-none px-4 py-3 text-label leading-relaxed text-foreground break-words [&_a]:text-primary [&_a]:underline [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded [&_table]:max-w-full [&_table]:overflow-x-auto [&_td]:align-top [&_th]:align-top [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      </div>
    </div>
  );
}
