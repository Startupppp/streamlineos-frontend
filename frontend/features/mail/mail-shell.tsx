"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useMailAccounts, useMailAction } from "@/hooks/api/mail";
import { useFinalizeIntegrationConnection } from "@/hooks/api/integrations";
import { useCan, usePermissionGate } from "@/hooks/api/access";
import { PageState } from "@/components/shared/page-state";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useMailPresentation } from "./mail-presentation";
import { useMailSelection } from "./use-mail-selection";
import { MailListPane } from "./mail-list-pane";
import { MailEmptyPane } from "./mail-empty-pane";
import { MailHeader, MAIL_ACCOUNT_SENTINEL } from "./mail-header";
import { seedMailDetailFromSummary } from "@/hooks/api/mail-action-cache";
import { useMailInboxSummarySheet } from "./use-mail-inbox-summary";
import { MailContentSkeleton, MailReadingPaneSkeleton, MailSheetSkeleton } from "./mail-shell-skeletons";
import type { MailReplyParams } from "./mail-reading-ai-actions";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";

const MailReadingPane = dynamic(
  () => import("./mail-reading-pane").then((m) => ({ default: m.MailReadingPane })),
  { ssr: false, loading: () => <MailReadingPaneSkeleton /> },
);
const MailAccountsSheet = dynamic(
  () => import("./mail-accounts-sheet").then((m) => ({ default: m.MailAccountsSheet })),
  { ssr: false, loading: () => <MailSheetSkeleton /> },
);
const MailComposeSheet = dynamic(
  () => import("./mail-compose-sheet").then((m) => ({ default: m.MailComposeSheet })),
  { ssr: false, loading: () => <MailSheetSkeleton /> },
);
const MailInboxSummarySheet = dynamic(
  () => import("./mail-inbox-summary-sheet").then((m) => ({ default: m.MailInboxSummarySheet })),
  { ssr: false, loading: () => <MailSheetSkeleton /> },
);

export function MailShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: accounts = [], isLoading: accountsLoading, isError: accountsFailed, error: accountsError, refetch: refetchAccounts } = useMailAccounts();
  const finalize = useFinalizeIntegrationConnection();
  const finalizeRef = useRef(false);
  const canAi = useCan("mail:ai:use");
  const canManageMail = useCan("mail:messages:manage");
  const canConnect = useCan("integrations:connections:manage");
  const inboxAccess = usePermissionGate("mail:inbox:view");
  const mailAction = useMailAction();

  const hasDeepLink = Boolean(searchParams.get("accountId") && (searchParams.get("messageId") || searchParams.get("threadId")));
  const startWithCompose = searchParams.get("compose") === "1";

  const {
    composeOpen, composeMode,
    listPaneClass, detailPaneClass,
    accountsSheetOpen, accountsSheetDismissed,
    summarySheetOpen, recentDrawerOpen,
    selectMessage: presentSelectMessage,
    backToList: presentBackToList,
    openCompose, closeCompose,
    openAccountsSheet, closeAccountsSheet,
    openSummarySheet, closeSummarySheet,
    openRecentDrawer, closeRecentDrawer,
  } = useMailPresentation(hasDeepLink, startWithCompose);

  const { activeMessage, deepLinkStatus, select, clear } = useMailSelection({
    accounts,
    accountsLoading,
    canManageMail,
    mailActionMutate: mailAction.mutate,
  });

  const [requestedAccountId, setRequestedAccountId] = useState<number | "all">("all");
  const selectedAccountId = requestedAccountId === "all" || accounts.some((a) => a.id === requestedAccountId) ? requestedAccountId : "all";

  const { summaryState, triggerSummary } = useMailInboxSummarySheet(selectedAccountId);
  const composeParamConsumedRef = useRef(false);
  const finalizeMutate = finalize.mutate;

  useEffect(() => {
    const connectedAccountId = searchParams.get("connected_account_id") ?? searchParams.get("connectedAccountId");
    if (!connectedAccountId) return;
    if (finalizeRef.current) return;
    finalizeRef.current = true;
    finalizeMutate(connectedAccountId, {
      onSuccess: (connection) => {
        toast.success(`${connection.accountEmail ?? "Account"} connected`);
        openAccountsSheet();
      },
      onError: (error) => toast.error(getErrorMessage(error)),
      onSettled: () => {
        const next = new URLSearchParams(searchParams.toString());
        next.delete("connected_account_id");
        next.delete("connectedAccountId");
        router.replace(`/mail${next.size > 0 ? `?${next.toString()}` : ""}`);
      },
    });
  }, [searchParams, finalizeMutate, router, openAccountsSheet]);

  useEffect(() => {
    if (composeParamConsumedRef.current) return;
    if (searchParams.get("compose") !== "1") return;
    composeParamConsumedRef.current = true;
    const next = new URLSearchParams(searchParams.toString());
    next.delete("compose");
    router.replace(`/mail${next.size > 0 ? `?${next.toString()}` : ""}`);
  }, [searchParams, router]);

  const handleAccountChange = useCallback((value: string) => {
    if (value === MAIL_ACCOUNT_SENTINEL) { setRequestedAccountId("all"); }
    else { const id = Number(value); setRequestedAccountId(Number.isNaN(id) ? "all" : id); }
    clear();
  }, [clear]);

  const handleSelectMessage = useCallback((message: Parameters<typeof select>[0]) => {
    seedMailDetailFromSummary(queryClient, message);
    select(message);
    presentSelectMessage();
  }, [queryClient, select, presentSelectMessage]);

  const handleSelectRecentMessage = useCallback((message: Parameters<typeof select>[0]) => {
    closeRecentDrawer();
    handleSelectMessage(message);
  }, [closeRecentDrawer, handleSelectMessage]);

  const handleBackToList = useCallback(() => { clear(); presentBackToList(); }, [clear, presentBackToList]);
  const handleOpenCompose = useCallback(() => openCompose({ type: "compose" }), [openCompose]);
  const handleReply = useCallback((params: MailReplyParams) => openCompose({ type: "reply", ...params }), [openCompose]);
  const handleGenerateBrief = useCallback(() => { openSummarySheet(); triggerSummary(selectedAccountId); }, [openSummarySheet, triggerSummary, selectedAccountId]);
  const handleRecentDrawerOpenChange = useCallback((open: boolean) => { if (!open) closeRecentDrawer(); }, [closeRecentDrawer]);
  const handleRetryAccounts = useCallback(() => { void refetchAccounts(); }, [refetchAccounts]);

  const effectiveAccountsSheetOpen = accountsSheetOpen || (deepLinkStatus === "needs_reauth" && !accountsSheetDismissed);
  const hasAccounts = accounts.length > 0;
  const pageState: PageStateResolution = inboxAccess.denied
    ? { kind: "denied", permission: inboxAccess.permission, message: "Mail is not available to your role." }
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
        onOpenBrief={openSummarySheet}
        onOpenAccounts={openAccountsSheet}
        onOpenRecent={openRecentDrawer}
      />

      <PageState
        resolution={pageState}
        loading={<MailContentSkeleton />}
        empty={<MailEmptyPane variant="connect" onConnect={canConnect ? openAccountsSheet : undefined} />}
        onRetry={handleRetryAccounts}
      >
        <div className="flex flex-1 min-h-0 min-w-0">
          <div className={listPaneClass}>
            <MailListPane
              selectedMessageId={activeMessage?.id ?? null}
              selectedAccountId={selectedAccountId}
              onSelectMessage={handleSelectMessage}
              onOpenAccountsSheet={openAccountsSheet}
              accounts={accounts}
            />
          </div>

          <div className={detailPaneClass}>
            {deepLinkStatus === "not_found" ? (
              <MailEmptyPane variant="not_found" />
            ) : deepLinkStatus === "needs_reauth" ? (
              <MailEmptyPane variant="needs_reauth" onReconnect={openAccountsSheet} />
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
        <MailAccountsSheet open={effectiveAccountsSheetOpen} onClose={closeAccountsSheet} />
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
        <MailInboxSummarySheet open={summarySheetOpen} onClose={closeSummarySheet} summaryState={summaryState} />
      )}
      <Drawer open={recentDrawerOpen} onOpenChange={handleRecentDrawerOpenChange} shouldScaleBackground={false}>
        <DrawerContent className="max-h-[88dvh] gap-0 overflow-hidden p-0">
          <DrawerHeader className="border-b border-border px-4 py-3 text-left">
            <DrawerTitle>Recent mail</DrawerTitle>
            <DrawerDescription>Open a recent message without losing your place.</DrawerDescription>
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
