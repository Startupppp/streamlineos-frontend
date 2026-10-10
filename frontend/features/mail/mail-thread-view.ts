"use client";

import { useMemo } from "react";
import { useMailThread, useMailMessage } from "@/hooks/api/mail";
import { sanitizeHtml, type SanitizeHtmlPolicy } from "@/lib/sanitize-html";
import type { MailMessageDetail } from "@/types/mail";

const ALLOWED_TAGS = [
  "a",
  "abbr",
  "b",
  "blockquote",
  "br",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "dd",
  "del",
  "dfn",
  "div",
  "dl",
  "dt",
  "em",
  "figcaption",
  "figure",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "img",
  "ins",
  "kbd",
  "li",
  "mark",
  "ol",
  "p",
  "pre",
  "q",
  "s",
  "samp",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "time",
  "tr",
  "u",
  "ul",
  "var",
];

const ALLOWED_ATTR = [
  "align",
  "alt",
  "border",
  "cellpadding",
  "cellspacing",
  "class",
  "colspan",
  "height",
  "href",
  "rowspan",
  "src",
  "style",
  "target",
  "title",
  "valign",
  "width",
  "loading",
  "referrerpolicy",
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
  return html.replace(
    /<img(\s)/gi,
    '<img loading="lazy" referrerpolicy="no-referrer"$1',
  );
}

function countRemoteImages(html: string): number {
  const matches = html.match(/<img[^>]+src=["']https?:\/\//gi);
  return matches?.length ?? 0;
}

function makeSafeHtml(raw: string): string {
  const sanitized = sanitizeHtml(raw, MAIL_POLICY);
  return hardenImages(hardenLinks(sanitized));
}

type MessageBody =
  | { kind: "html"; safeHtml: string }
  | { kind: "text"; text: string }
  | { kind: "snippet"; text: string }
  | { kind: "empty" };

export interface ThreadAttachment {
  id: string;
  fileName: string;
  sizeBytes: number | null;
  mimeType: string;
  downloadPath: string;
}

export interface ThreadMessageView extends Omit<
  MailMessageDetail,
  "bodyHtml" | "bodyText" | "attachments"
> {
  body: MessageBody;
  remoteImageCount: number;
  attachments: ThreadAttachment[];
}

interface ThreadView {
  status: "seeded" | "hydrating" | "hydrated" | "error";
  messages: ThreadMessageView[];
  error?: unknown;
}

function toMessageView(
  m: MailMessageDetail,
  isFetchedAfterMount: boolean,
): ThreadMessageView {
  const { bodyHtml, bodyText, attachments, ...rest } = m;

  let body: MessageBody;
  if (bodyHtml !== null) {
    body = { kind: "html", safeHtml: makeSafeHtml(bodyHtml) };
  } else if (bodyText !== null) {
    body = { kind: "text", text: bodyText };
  } else if (!isFetchedAfterMount) {
    body = { kind: "snippet", text: m.snippet };
  } else {
    body = { kind: "empty" };
  }

  const threadAttachments: ThreadAttachment[] = attachments.map((att) => ({
    id: att.id,
    fileName: att.fileName,
    sizeBytes: att.sizeBytes,
    mimeType: att.mimeType,
    downloadPath: `/mail/messages/${m.id}/attachments/${att.id}?accountId=${m.accountId}&fileName=${encodeURIComponent(att.fileName)}`,
  }));

  return {
    ...rest,
    body,
    remoteImageCount:
      body.kind === "html" ? countRemoteImages(body.safeHtml) : 0,
    attachments: threadAttachments,
  };
}

function readThreadView(
  messages: MailMessageDetail[] | undefined,
  isFetching: boolean,
  isError: boolean,
  error: unknown,
  isFetchedAfterMount: boolean,
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

  const status: "seeded" | "hydrating" | "hydrated" =
    allNullBody && !isFetchedAfterMount
      ? isFetching
        ? "hydrating"
        : "seeded"
      : "hydrated";

  return {
    status,
    messages: messages.map((m) => toMessageView(m, isFetchedAfterMount)),
  };
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
    isFetchedAfterMount: threadFetchedAfterMount,
  } = useMailThread(accountId, threadId);

  const {
    data: singleMessage,
    isLoading: singleLoading,
    isFetching: singleFetching,
    isError: singleError,
    error: singleErr,
    refetch: retrySingle,
    isFetchedAfterMount: singleFetchedAfterMount,
  } = useMailMessage(accountId, threadId ? undefined : messageId);

  const isLoading = threadId ? threadLoading : singleLoading;
  const isFetching = threadId ? threadFetching : singleFetching;
  const isError = threadId ? threadError : singleError;
  const error = threadId ? threadErr : singleErr;
  const retry = threadId ? retryThread : retrySingle;
  const isFetchedAfterMount = threadId
    ? threadFetchedAfterMount
    : singleFetchedAfterMount;

  const rawMessages = useMemo<MailMessageDetail[] | undefined>(() => {
    if (threadId && threadMessages) return threadMessages;
    if (!threadId && singleMessage) return [singleMessage];
    return undefined;
  }, [threadId, threadMessages, singleMessage]);

  const view = useMemo(
    () =>
      readThreadView(
        rawMessages,
        isFetching,
        isError,
        error,
        isFetchedAfterMount,
      ),
    [rawMessages, isFetching, isError, error, isFetchedAfterMount],
  );

  return { ...view, isLoading, retry };
}
