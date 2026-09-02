"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useMailAccounts, useMailAction } from "@/hooks/api/mail";
import { useFinalizeIntegrationConnection } from "@/hooks/api/integrations";
import { useCan } from "@/hooks/api/access";
import { MailListPane } from "./mail-list-pane";
import { MailAccountsSheet } from "./mail-accounts-sheet";
import { MailReadingPane } from "./mail-reading-pane";
import { MailComposeSheet } from "./mail-compose-sheet";
import {
  MailInboxSummarySheet,
  useMailInboxSummarySheet,
} from "./mail-inbox-summary-sheet";
import { MailEmptyPane } from "./mail-empty-pane";
import { MailHeader, MAIL_ACCOUNT_SENTINEL } from "./mail-header";
import type { MailMessageSummary } from "@/types/mail";
import type { MailComposeMode } from "./mail-compose-sheet";
import type { MailReplyParams } from "./mail-reading-ai-actions";

export function MailShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: accounts = [], isLoading: accountsLoading } = useMailAccounts();
  const finalize = useFinalizeIntegrationConnection();
  const finalizeRef = useRef(false);
  const canAi = useCan("mail:ai:use");
  const canManageMail = useCan("mail:messages:manage");
  const mailAction = useMailAction();

  const [accountsSheetOpen, setAccountsSheetOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<number | "all">(
    "all",
  );
  const [selectedMessage, setSelectedMessage] =
    useState<MailMessageSummary | null>(null);
  const [showMobileList, setShowMobileList] = useState(true);
  const [composeOpen, setComposeOpen] = useState(
    () => searchParams.get("compose") === "1",
  );
  const [composeMode, setComposeMode] = useState<MailComposeMode>({
    type: "compose",
  });
  const [summarySheetOpen, setSummarySheetOpen] = useState(false);
  const composeParamConsumedRef = useRef(false);

  const { summaryState, triggerSummary } = useMailInboxSummarySheet();

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
    setComposeMode({ type: "compose" });
    setComposeOpen(true);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("compose");
    router.replace(`/mail${next.size > 0 ? `?${next.toString()}` : ""}`);
  }, [searchParams, router]);

  const handleOpenAccountsSheet = useCallback(
    () => setAccountsSheetOpen(true),
    [],
  );
  const handleCloseAccountsSheet = useCallback(
    () => setAccountsSheetOpen(false),
    [],
  );

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
      setShowMobileList(false);
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
    [canManageMail, mailActionMutate],
  );

  const handleBackToList = useCallback(() => {
    setShowMobileList(true);
    setSelectedMessage(null);
  }, []);

  const handleOpenCompose = useCallback(() => {
    setComposeMode({ type: "compose" });
    setComposeOpen(true);
  }, []);

  const handleCloseCompose = useCallback(() => setComposeOpen(false), []);

  const handleReply = useCallback((params: MailReplyParams) => {
    setComposeMode({
      type: "reply",
      messageId: params.messageId,
      threadId: params.threadId,
      toEmail: params.toEmail,
      subject: params.subject,
      accountId: params.accountId,
      prefillBody: params.prefillBody,
    });
    setComposeOpen(true);
  }, []);

  const handleOpenSummary = useCallback(() => {
    setSummarySheetOpen(true);
    triggerSummary(selectedAccountId);
  }, [triggerSummary, selectedAccountId]);

  const handleCloseSummary = useCallback(() => setSummarySheetOpen(false), []);

  const hasAccounts = accounts.length > 0;

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      <MailHeader
        accounts={accounts}
        accountsLoading={accountsLoading}
        selectedAccountId={selectedAccountId}
        canAi={canAi}
        onAccountChange={handleAccountChange}
        onCompose={handleOpenCompose}
        onSummarize={handleOpenSummary}
        onOpenAccounts={handleOpenAccountsSheet}
      />

      <div className="flex flex-1 min-h-0 min-w-0">
        <div
          className={cn(
            "flex flex-col h-full shrink-0 border-r border-border/40 bg-card/40 w-full md:w-[280px] lg:w-[320px]",
            !showMobileList && "hidden md:flex",
          )}
        >
          <MailListPane
            selectedMessageId={selectedMessage?.id ?? null}
            selectedAccountId={selectedAccountId}
            onSelectMessage={handleSelectMessage}
            onOpenAccountsSheet={handleOpenAccountsSheet}
            accounts={accounts}
          />
        </div>

        <div
          className={cn(
            "flex flex-1 min-h-0 min-w-0 bg-muted/15",
            showMobileList && "hidden md:flex",
          )}
        >
          {!hasAccounts && !accountsLoading ? (
            <MailEmptyPane
              variant="connect"
              onConnect={handleOpenAccountsSheet}
            />
          ) : selectedMessage ? (
            <MailReadingPane
              selectedMessage={selectedMessage}
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

      <MailAccountsSheet
        open={accountsSheetOpen}
        onClose={handleCloseAccountsSheet}
      />

      <MailComposeSheet
        open={composeOpen}
        onClose={handleCloseCompose}
        mode={composeMode}
        accounts={accounts}
      />

      <MailInboxSummarySheet
        open={summarySheetOpen}
        onClose={handleCloseSummary}
        summaryState={summaryState}
      />
    </div>
  );
}
