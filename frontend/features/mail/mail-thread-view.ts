"use client";

import { useMemo } from "react";
import { useMailThread, useMailMessage } from "@/hooks/api/mail";
import { sanitizeHtml, type SanitizeHtmlPolicy } from "@/lib/sanitize-html";
import type { MailMessageDetail } from "@/types/mail";

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

function countRemoteImages(html: string): number {
  const matches = html.match(/<img[^>]+src=["']https?:\/\//gi);
  return matches?.length ?? 0;
}

function makeSafeHtml(raw: string): string {
  const sanitized = sanitizeHtml(raw, MAIL_POLICY);
  return hardenImages(hardenLinks(sanitized));
}

export interface ThreadMessageView extends Omit<MailMessageDetail, "bodyHtml"> {
  safeBodyHtml: string | null;
  hasBody: boolean;
  remoteImageCount: number;
  blockedImageCount: number;
}

interface ThreadView {
  status: "seeded" | "hydrating" | "hydrated" | "error";
  messages: ThreadMessageView[];
  error?: unknown;
}

function toMessageView(m: MailMessageDetail): ThreadMessageView {
  const { bodyHtml, ...rest } = m;
  const safeBodyHtml = bodyHtml ? makeSafeHtml(bodyHtml) : null;
  return {
    ...rest,
    safeBodyHtml,
    hasBody: safeBodyHtml !== null || m.bodyText !== null,
    remoteImageCount: safeBodyHtml ? countRemoteImages(safeBodyHtml) : 0,
    blockedImageCount: 0,
  };
}

export function readThreadView(
  messages: MailMessageDetail[] | undefined,
  isFetching: boolean,
  isError: boolean,
  error: unknown,
): ThreadView {
  if (isError) {
    return { status: "error", messages: [], error };
  }

  if (!messages || messages.length === 0) {
    return { status: isFetching ? "hydrating" : "hydrated", messages: [] };
  }

  const allNullBody = messages.every(
    (m) => m.bodyHtml === null && m.bodyText === null,
  );

  const status: "seeded" | "hydrating" | "hydrated" = allNullBody
    ? (isFetching ? "hydrating" : "seeded")
    : "hydrated";

  return { status, messages: messages.map(toMessageView) };
}

interface UseMailThreadViewParams {
  accountId: number;
  threadId: string | undefined;
  messageId: string | undefined;
}

export function useMailThreadView({
  accountId,
  threadId,
  messageId,
}: UseMailThreadViewParams) {
  const {
    data: threadMessages,
    isLoading: threadLoading,
    isFetching: threadFetching,
    isError: threadError,
    error: threadErr,
    refetch: retryThread,
  } = useMailThread(accountId, threadId);

  const {
    data: singleMessage,
    isLoading: singleLoading,
    isFetching: singleFetching,
    isError: singleError,
    error: singleErr,
    refetch: retrySingle,
  } = useMailMessage(accountId, threadId ? undefined : messageId);

  const isLoading = threadId ? threadLoading : singleLoading;
  const isFetching = threadId ? threadFetching : singleFetching;
  const isError = threadId ? threadError : singleError;
  const error = threadId ? threadErr : singleErr;
  const retry = threadId ? retryThread : retrySingle;

  const rawMessages = useMemo<MailMessageDetail[] | undefined>(() => {
    if (threadId && threadMessages) return threadMessages;
    if (!threadId && singleMessage) return [singleMessage];
    return undefined;
  }, [threadId, threadMessages, singleMessage]);

  const view = useMemo(
    () => readThreadView(rawMessages, isFetching, isError, error),
    [rawMessages, isFetching, isError, error],
  );

  return { ...view, isLoading, retry };
}
