"use client";

import { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { useSanitizedHtml } from "@/hooks/common/use-sanitized-html";
import type { SanitizeHtmlPolicy } from "@/lib/sanitize-html";

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
  "loading", "referrerpolicy",
];

const MAIL_POLICY: SanitizeHtmlPolicy = {
  config: {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORCE_BODY: true,
    ALLOW_UNKNOWN_PROTOCOLS: false,
  },
};

function hardenLinks(html: string): string {
  return html.replace(
    /<a(\s)/gi,
    '<a target="_blank" rel="noopener noreferrer"$1',
  );
}

function hardenImages(html: string): string {
  return html.replace(/<img(\s)/gi, '<img loading="lazy" referrerpolicy="no-referrer"$1');
}

interface MailHtmlViewerProps {
  html: string;
  className?: string;
}

export function MailHtmlViewer({ html, className }: MailHtmlViewerProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const sanitizedBody = useSanitizedHtml(html, MAIL_POLICY);

  const sanitized = useMemo(
    () => (sanitizedBody === null ? "" : hardenImages(hardenLinks(sanitizedBody))),
    [sanitizedBody],
  );

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;

    body.querySelectorAll("td").forEach((cell) => {
      const children = Array.from(cell.childNodes).filter(
        (node) => node.nodeType !== Node.TEXT_NODE || Boolean(node.textContent?.trim()),
      );
      if (children.length === 1 && children[0] instanceof Element &&
          ["TABLE", "DIV"].includes(children[0].tagName)) {
        cell.dataset.mailLayoutCell = "true";
      }
    });
    const rowImages = new WeakMap<HTMLTableRowElement, Set<string>>();
    const cleanups = Array.from(body.querySelectorAll("img")).map((image) => {
      const row = image.closest("tr");
      const src = image.getAttribute("src");
      if (row && src) {
        const seen = rowImages.get(row) ?? new Set<string>();
        if (seen.has(src)) {
          image.dataset.mailDuplicateImage = "true";
          const cell = image.closest("td");
          if (cell && cell.querySelectorAll("img").length === 1 && !cell.textContent?.trim()) {
            cell.dataset.mailDuplicateImageCell = "true";
          }
        }
        seen.add(src);
        rowImages.set(row, seen);
      }
      const markLoaded = () => {
        image.dataset.mailImageState = "loaded";
      };
      const markFailed = () => {
        image.dataset.mailImageState = "failed";
      };

      image.addEventListener("load", markLoaded);
      image.addEventListener("error", markFailed);
      if (image.complete) {
        if (image.naturalWidth > 0) markLoaded();
        else markFailed();
      }

      return () => {
        image.removeEventListener("load", markLoaded);
        image.removeEventListener("error", markFailed);
      };
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [sanitized]);

  return (
    <div className={cn("w-full min-w-0 max-w-full", className)}>
      <div
        className="mail-html-frame @container w-full min-w-0 max-w-full overflow-x-hidden rounded-lg border border-border/50 bg-white text-foreground shadow-sm"
        style={{ colorScheme: "light" }}
      >
        <div
          className="w-full min-w-0 max-w-full overflow-hidden px-3 py-3 sm:px-4"
        >
          <div
            ref={bodyRef}
            className="mail-html-body min-w-0 max-w-none text-label leading-relaxed text-foreground break-words [overflow-wrap:anywhere] @max-[640px]:[&_table]:!w-full @max-[640px]:[&_table]:!min-w-0 @max-[640px]:[&_table]:!max-w-full @max-[640px]:[&_tbody]:block @max-[640px]:[&_tr]:block @max-[640px]:[&_td]:block @max-[640px]:[&_td]:!w-full @max-[640px]:[&_td]:!max-w-full @max-[640px]:[&_td]:!box-border @max-[640px]:[&_td]:!p-3 @max-[640px]:[&_td[data-mail-layout-cell=true]]:!p-0 @max-[640px]:[&_td[data-mail-duplicate-image-cell=true]]:hidden @max-[640px]:[&_th]:block @max-[640px]:[&_th]:!w-full @max-[640px]:[&_div]:!max-w-full @max-[640px]:[&_img[data-mail-duplicate-image=true]]:hidden [&_*]:max-w-full [&_a]:text-primary [&_a]:underline [&_img]:!max-w-full [&_img]:rounded [&_img[data-mail-image-state=failed]]:hidden [&_img[data-mail-image-state=loaded]]:!h-auto [&_table]:!max-w-full [&_table]:!min-w-0 [&_td]:align-top [&_td]:break-words [&_th]:align-top [&_th]:break-words [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground"
            style={{ width: "100%" }}
            dangerouslySetInnerHTML={{ __html: sanitized }}
          />
        </div>
      </div>
    </div>
  );
}
