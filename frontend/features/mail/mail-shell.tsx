"use client";

import { useCallback, useRef, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useMailAccounts, useMailAction } from "@/hooks/api/mail";
import { useFinalizeIntegrationConnection } from "@/hooks/api/integrations";
import { useCan, usePermissionGate } from "@/hooks/api/access";
import { PageState } from "@/components/shared/page-state";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMailPresentation } from "./mail-presentation";
import { MailListPane } from "./mail-list-pane";
import { MailEmptyPane } from "./mail-empty-pane";
import { MailHeader, MAIL_ACCOUNT_SENTINEL } from "./mail-header";
import { seedMailDetailFromSummary } from "./mail-thread-seed";
import { useMailInboxSummarySheet } from "./use-mail-inbox-summary";
import {
  MailContentSkeleton,
  MailReadingPaneSkeleton,
  MailSheetSkeleton,
} from "./mail-shell-skeletons";
import type { MailMessageSummary } from "@/types/mail";
import type { MailComposeMode } from "./mail-compose-schema";
import type { MailReplyParams } from "./mail-reading-ai-actions";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";

const MailReadingPane = dynamic(
  () =>
    import("./mail-reading-pane").then((m) => ({ default: m.MailReadingPane })),
  { ssr: false, loading: () => <MailReadingPaneSkeleton /> },
);

const MailAccountsSheet = dynamic(
  () =>
    import("./mail-accounts-sheet").then((m) => ({
      default: m.MailAccountsSheet,
    })),
  { ssr: false, loading: () => <MailSheetSkeleton /> },
);

const MailComposeSheet = dynamic(
  () =>
    import("./mail-compose-sheet").then((m) => ({
      default: m.MailComposeSheet,
    })),
  { ssr: false, loading: () => <MailSheetSkeleton /> },
);

const MailInboxSummarySheet = dynamic(
  () =>
    import("./mail-inbox-summary-sheet").then((m) => ({
      default: m.MailInboxSummarySheet,
    })),
  { ssr: false, loading: () => <MailSheetSkeleton /> },
);

export function MailShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const {
    data: accounts = [],
    isLoading: accountsLoading,
    isError: accountsFailed,
    error: accountsError,
    refetch: refetchAccounts,
  } = useMailAccounts();
  const finalize = useFinalizeIntegrationConnection();
  const finalizeRef = useRef(false);
  const canAi = useCan("mail:ai:use");
  const canManageMail = useCan("mail:messages:manage");
  const canConnect = useCan("integrations:connections:manage");
  const inboxAccess = usePermissionGate("mail:inbox:view");
  const mailAction = useMailAction();

  const [accountsSheetOpen, setAccountsSheetOpen] = useState(false);
  const [accountsSheetDismissed, setAccountsSheetDismissed] = useState(false);
  const [requestedAccountId, setSelectedAccountId] = useState<number | "all">(
    "all",
  );
  const selectedAccountId =
    requestedAccountId === "all" ||
    accounts.some((account) => account.id === requestedAccountId)
      ? requestedAccountId
      : "all";
  const [selectedMessage, setSelectedMessage] =
    useState<MailMessageSummary | null>(null);
  const hasDeepLink = Boolean(
    searchParams.get("accountId") &&
    (searchParams.get("messageId") || searchParams.get("threadId")),
  );
  const startWithCompose = searchParams.get("compose") === "1";
  const {
    composeOpen,
    listPaneClass,
    detailPaneClass,
    selectMessage: presentSelectMessage,
    backToList: presentBackToList,
    openCompose,
    closeCompose,
  } = useMailPresentation(hasDeepLink, startWithCompose);
  const [composeMode, setComposeMode] = useState<MailComposeMode>({
    type: "compose",
  });
  const [summarySheetOpen, setSummarySheetOpen] = useState(false);
  const [recentDrawerOpen, setRecentDrawerOpen] = useState(false);
  const composeParamConsumedRef = useRef(false);

  const rawAccountId = searchParams.get("accountId");
  const parsedAccountId = rawAccountId !== null ? Number(rawAccountId) : NaN;
  const urlAccountId =
    Number.isFinite(parsedAccountId) &&
    parsedAccountId > 0 &&
    Number.isInteger(parsedAccountId)
      ? parsedAccountId
      : null;
  const urlMessageId = searchParams.get("messageId") || null;
  const urlThreadId = searchParams.get("threadId") || null;

  const { summaryState, triggerSummary } =
    useMailInboxSummarySheet(selectedAccountId);

  const finalizeMutate = finalize.mutate;
  useEffect(() => {
    const connectedAccountId =
      searchParams.get("connected_account_id") ??
      searchParams.get("connectedAccountId");
    if (!connectedAccountId) return;
    if (finalizeRef.current) return;
    finalizeRef.current = true;
    finalizeMutate(connectedAccountId, {
      onSuccess: (connection) => {
        toast.success(`${connection.accountEmail ?? "Account"} connected`);
        setAccountsSheetOpen(true);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
      onSettled: () => {
        const next = new URLSearchParams(searchParams.toString());
        next.delete("connected_account_id");
        next.delete("connectedAccountId");
        router.replace(`/mail${next.size > 0 ? `?${next.toString()}` : ""}`);
      },
    });
  }, [searchParams, finalizeMutate, router]);

  useEffect(() => {
    if (composeParamConsumedRef.current) return;
    if (searchParams.get("compose") !== "1") return;
    composeParamConsumedRef.current = true;
    const next = new URLSearchParams(searchParams.toString());
    next.delete("compose");
    router.replace(`/mail${next.size > 0 ? `?${next.toString()}` : ""}`);
  }, [searchParams, router]);

  const handleOpenAccountsSheet = useCallback(() => {
    setAccountsSheetDismissed(false);
    setAccountsSheetOpen(true);
  }, []);
  const handleCloseAccountsSheet = useCallback(() => {
    setAccountsSheetDismissed(true);
    setAccountsSheetOpen(false);
  }, []);

  const handleAccountChange = useCallback((value: string) => {
    if (value === MAIL_ACCOUNT_SENTINEL) {
      setSelectedAccountId("all");
    } else {
      const id = Number(value);
      setSelectedAccountId(Number.isNaN(id) ? "all" : id);
    }
    setSelectedMessage(null);
  }, []);

  const mailActionMutate = mailAction.mutate;
  const handleSelectMessage = useCallback(
    (message: MailMessageSummary) => {
      presentSelectMessage();
      seedMailDetailFromSummary(queryClient, message);

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
    [
      canManageMail,
      mailActionMutate,
      presentSelectMessage,
      queryClient,
      searchParams,
      router,
    ],
  );
  const handleSelectRecentMessage = useCallback(
    (message: MailMessageSummary) => {
      setRecentDrawerOpen(false);
      handleSelectMessage(message);
    },
    [handleSelectMessage],
  );

  const deepLinkRequested =
    urlAccountId !== null && (urlMessageId !== null || urlThreadId !== null);
  const deepLinkAccount =
    urlAccountId === null
      ? undefined
      : accounts.find((account) => account.id === urlAccountId);
  const deepLinkStatus =
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

  const handleBackToList = useCallback(() => {
    presentBackToList();
    setSelectedMessage(null);
  }, [presentBackToList]);

  const handleOpenCompose = useCallback(() => {
    setComposeMode({ type: "compose" });
    openCompose();
  }, [openCompose]);

  const handleReply = useCallback(
    (params: MailReplyParams) => {
      setComposeMode({
        type: "reply",
        messageId: params.messageId,
        threadId: params.threadId,
        toEmail: params.toEmail,
        subject: params.subject,
        accountId: params.accountId,
        prefillBody: params.prefillBody,
      });
      openCompose();
    },
    [openCompose],
  );

  const handleCloseSummary = useCallback(() => setSummarySheetOpen(false), []);
  const handleGenerateBrief = useCallback(() => {
    setSummarySheetOpen(true);
    triggerSummary(selectedAccountId);
  }, [triggerSummary, selectedAccountId]);
  const handleBriefDetails = useCallback(() => setSummarySheetOpen(true), []);
  const handleOpenRecent = useCallback(() => setRecentDrawerOpen(true), []);
  const handleRecentDrawerOpenChange = useCallback(
    (open: boolean) => setRecentDrawerOpen(open),
    [],
  );

  const hasAccounts = accounts.length > 0;
  const selectedActiveMessage =
    selectedMessage &&
    accounts.some((account) => account.id === selectedMessage.accountId)
      ? selectedMessage
      : null;
  const activeMessage = selectedActiveMessage ?? deepLinkedMessage;
  const effectiveAccountsSheetOpen =
    accountsSheetOpen ||
    (deepLinkStatus === "needs_reauth" && !accountsSheetDismissed);
  const handleRetryAccounts = useCallback(() => {
    void refetchAccounts();
  }, [refetchAccounts]);

  const pageState: PageStateResolution = inboxAccess.denied
    ? {
        kind: "denied",
        permission: inboxAccess.permission,
        message: "Mail is not available to your role.",
      }
    : inboxAccess.pending || accountsLoading
      ? { kind: "loading" }
      : accountsFailed
        ? { kind: "error", error: accountsError }
        : !hasAccounts
          ? { kind: "empty" }
          : { kind: "ready" };

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      <MailHeader
        accounts={accounts}
        accountsLoading={accountsLoading}
        selectedAccountId={selectedAccountId}
        canAi={canAi}
        canCompose={canManageMail}
        showAccountSettings={!inboxAccess.denied && !accountsFailed}
        summaryState={summaryState}
        onAccountChange={handleAccountChange}
        onCompose={handleOpenCompose}
        onGenerateBrief={handleGenerateBrief}
        onOpenBrief={handleBriefDetails}
        onOpenAccounts={handleOpenAccountsSheet}
        onOpenRecent={handleOpenRecent}
      />

      <PageState
        resolution={pageState}
        loading={<MailContentSkeleton />}
        empty={
          <MailEmptyPane
            variant="connect"
            onConnect={canConnect ? handleOpenAccountsSheet : undefined}
          />
        }
        onRetry={handleRetryAccounts}
      >
        <div className="flex flex-1 min-h-0 min-w-0">
          <div className={listPaneClass}>
            <MailListPane
              selectedMessageId={activeMessage?.id ?? null}
              selectedAccountId={selectedAccountId}
              onSelectMessage={handleSelectMessage}
              onOpenAccountsSheet={handleOpenAccountsSheet}
              accounts={accounts}
            />
          </div>

          <div className={detailPaneClass}>
            {deepLinkStatus === "not_found" ? (
              <MailEmptyPane variant="not_found" />
            ) : deepLinkStatus === "needs_reauth" ? (
              <MailEmptyPane
                variant="needs_reauth"
                onReconnect={handleOpenAccountsSheet}
              />
            ) : activeMessage ? (
              <MailReadingPane
                selectedMessage={activeMessage}
                onBack={handleBackToList}
                onReply={handleReply}
              />
            ) : (
              <MailEmptyPane
                variant="select"
                selectedAccountId={selectedAccountId}
                onSelectMessage={handleSelectMessage}
              />
            )}
          </div>
        </div>
      </PageState>

      {effectiveAccountsSheetOpen && (
        <MailAccountsSheet
          open={effectiveAccountsSheetOpen}
          onClose={handleCloseAccountsSheet}
        />
      )}

      {composeOpen && (
        <MailComposeSheet
          open={composeOpen}
          onClose={closeCompose}
          mode={composeMode}
          accounts={accounts}
          preferredAccountId={selectedAccountId}
        />
      )}

      {summarySheetOpen && (
        <MailInboxSummarySheet
          open={summarySheetOpen}
          onClose={handleCloseSummary}
          summaryState={summaryState}
        />
      )}
      <Drawer
        open={recentDrawerOpen}
        onOpenChange={handleRecentDrawerOpenChange}
        shouldScaleBackground={false}
      >
        <DrawerContent className="max-h-[88dvh] gap-0 overflow-hidden p-0">
          <DrawerHeader className="border-b border-border px-4 py-3 text-left">
            <DrawerTitle>Recent mail</DrawerTitle>
            <DrawerDescription>
              Open a recent message without losing your place.
            </DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-hidden">
            <MailEmptyPane
              variant="select"
              selectedAccountId={selectedAccountId}
              onSelectMessage={handleSelectRecentMessage}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
