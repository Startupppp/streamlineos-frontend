"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { MailAccount, MailActionBody, MailMessageSummary } from "@/types/mail";

type DeepLinkStatus = "idle" | "not_found" | "needs_reauth";

interface UseMailSelectionParams {
  accounts: MailAccount[];
  accountsLoading: boolean;
  canManageMail: boolean;
  mailActionMutate: (
    params: { messageId: string; body: MailActionBody },
    options?: { onError?: () => void },
  ) => void;
}

interface UseMailSelectionResult {
  selectedMessage: MailMessageSummary | null;
  activeMessage: MailMessageSummary | null;
  deepLinkStatus: DeepLinkStatus;
  select: (message: MailMessageSummary) => void;
  clear: () => void;
}

function parseUrlAccountId(raw: string | null): number | null {
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 && Number.isInteger(parsed)
    ? parsed
    : null;
}

export function useMailSelection({
  accounts,
  accountsLoading,
  canManageMail,
  mailActionMutate,
}: UseMailSelectionParams): UseMailSelectionResult {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedMessage, setSelectedMessage] =
    useState<MailMessageSummary | null>(null);

  const urlAccountId = parseUrlAccountId(searchParams.get("accountId"));
  const urlMessageId = searchParams.get("messageId") || null;
  const urlThreadId = searchParams.get("threadId") || null;

  const deepLinkRequested =
    urlAccountId !== null && (urlMessageId !== null || urlThreadId !== null);
  const deepLinkAccount =
    urlAccountId === null
      ? undefined
      : accounts.find((account) => account.id === urlAccountId);

  const deepLinkStatus: DeepLinkStatus =
    !deepLinkRequested || accountsLoading || selectedMessage
      ? "idle"
      : !deepLinkAccount
        ? "not_found"
        : deepLinkAccount.status === "needs_reauth"
          ? "needs_reauth"
          : "idle";

  const deepLinkedMessage = useMemo<MailMessageSummary | null>(() => {
    if (
      !deepLinkRequested ||
      !deepLinkAccount ||
      deepLinkAccount.status === "needs_reauth" ||
      urlAccountId === null
    ) {
      return null;
    }
    return {
      id: urlThreadId ?? urlMessageId ?? "",
      threadId: urlThreadId,
      accountId: urlAccountId,
      provider: deepLinkAccount.provider,
      from: { name: null, email: "" },
      to: [],
      subject: "",
      snippet: "",
      date: "1970-01-01T00:00:00.000Z",
      isRead: false,
      isStarred: false,
      hasAttachments: false,
    };
  }, [
    deepLinkAccount,
    deepLinkRequested,
    urlAccountId,
    urlMessageId,
    urlThreadId,
  ]);

  const deepLinkActionRef = useRef<string | null>(null);
  useEffect(() => {
    if (!deepLinkedMessage || !canManageMail || deepLinkedMessage.isRead)
      return;
    const actionKey = `${deepLinkedMessage.accountId}:${deepLinkedMessage.id}`;
    if (deepLinkActionRef.current === actionKey) return;
    deepLinkActionRef.current = actionKey;
    mailActionMutate({
      messageId: deepLinkedMessage.id,
      body: {
        accountId: deepLinkedMessage.accountId,
        action: "markRead",
        ...(deepLinkedMessage.threadId && {
          threadId: deepLinkedMessage.threadId,
        }),
      },
    });
    const next = new URLSearchParams(searchParams.toString());
    router.replace(`/mail?${next.toString()}`, { scroll: false });
  }, [
    canManageMail,
    deepLinkedMessage,
    mailActionMutate,
    router,
    searchParams,
  ]);

  const select = useCallback(
    (message: MailMessageSummary) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("accountId", String(message.accountId));
      if (message.threadId) {
        next.set("threadId", message.threadId);
        next.delete("messageId");
      } else {
        next.set("messageId", message.id);
        next.delete("threadId");
      }
      router.replace(`/mail?${next.toString()}`, { scroll: false });

      if (message.isRead || !canManageMail) {
        setSelectedMessage(message);
        return;
      }
      setSelectedMessage({ ...message, isRead: true });
      mailActionMutate(
        {
          messageId: message.id,
          body: {
            accountId: message.accountId,
            action: "markRead",
            ...(message.threadId && { threadId: message.threadId }),
          },
        },
        { onError: () => setSelectedMessage(message) },
      );
    },
    [canManageMail, mailActionMutate, searchParams, router],
  );

  const clear = useCallback(() => {
    setSelectedMessage(null);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("messageId");
    next.delete("threadId");
    router.replace(`/mail${next.size > 0 ? `?${next.toString()}` : ""}`, {
      scroll: false,
    });
  }, [router, searchParams]);

  const selectedActiveMessage =
    selectedMessage &&
    accounts.some((account) => account.id === selectedMessage.accountId)
      ? selectedMessage
      : null;
  const activeMessage = selectedActiveMessage ?? deepLinkedMessage;

  return {
    selectedMessage,
    activeMessage,
    deepLinkStatus,
    select,
    clear,
  };
}
