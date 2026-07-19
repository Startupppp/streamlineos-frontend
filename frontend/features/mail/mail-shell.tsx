"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings } from "lucide-react";
import { SparklesIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useMailAccounts } from "@/hooks/api/mail";
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
import { EmptyState } from "@/components/ui/empty-state";
import type { MailMessageSummary } from "@/types/mail";
import type { MailComposeMode } from "./mail-compose-sheet";
import type { MailReplyParams } from "./mail-reading-pane";

const SENTINEL = "__all__";

export function MailShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: accounts = [], isLoading: accountsLoading } = useMailAccounts();
  const finalize = useFinalizeIntegrationConnection();
  const finalizeRef = useRef(false);
  const canAi = useCan("mail:ai:use");

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
  const { iconRef: sparklesRef, hoverHandlers: sparklesHover } =
    useAnimatedIcon();

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
    if (value === SENTINEL) {
      setSelectedAccountId("all");
    } else {
      const id = Number(value);
      setSelectedAccountId(Number.isNaN(id) ? "all" : id);
    }
    setSelectedMessage(null);
  }, []);

  const handleSelectMessage = useCallback((message: MailMessageSummary) => {
    setSelectedMessage(message);
    setShowMobileList(false);
  }, []);

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

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 shrink-0 bg-card/50">
        <span className="text-sm font-semibold text-foreground tracking-tight shrink-0">
          Mail
        </span>

        {accountsLoading ? (
          <Skeleton className="h-9 w-36 rounded-md" />
        ) : accounts.length > 0 ? (
          <Select
            value={
              selectedAccountId === "all" ? SENTINEL : String(selectedAccountId)
            }
            onValueChange={handleAccountChange}
          >
            <SelectTrigger className="h-9 w-auto min-w-[9rem] max-w-[14rem] border-input bg-card text-xs">
              <SelectValue placeholder="All accounts" />
            </SelectTrigger>
            <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
              <SelectItem value={SENTINEL} className="text-xs">
                All accounts
              </SelectItem>
              {accounts.map((account) => (
                <SelectItem
                  key={account.id}
                  value={String(account.id)}
                  className="text-xs"
                >
                  {account.accountEmail ??
                    account.accountLabel ??
                    `Account ${account.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <div className="flex-1" />

        {canAi && accounts.length > 0 && (
          <button
            type="button"
            className="flex items-center gap-1.5 h-9 px-3 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-input bg-card transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onClick={handleOpenSummary}
            aria-label="Summarize inbox with AI"
            {...sparklesHover}
          >
            <SparklesIcon ref={sparklesRef} size={13} />
            Summarize
          </button>
        )}

        <Button
          variant="outline"
          size="sm"
          className="h-9 text-xs gap-1.5"
          onClick={handleOpenCompose}
          disabled={accounts.length === 0}
        >
          Compose
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={handleOpenAccountsSheet}
          aria-label="Mail account settings"
        >
          <Settings className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      <div className="flex flex-1 min-h-0 min-w-0">
        <div
          className={cn(
            "flex flex-col h-full shrink-0 border-r border-border/40 bg-card/50 w-full md:w-[260px] lg:w-[300px]",
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
            "flex flex-1 min-h-0 min-w-0 bg-muted/10",
            showMobileList && "hidden md:flex",
          )}
        >
          {selectedMessage ? (
            <MailReadingPane
              selectedMessage={selectedMessage}
              accounts={accounts}
              onBack={handleBackToList}
              onReply={handleReply}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState
                illustrationPreset="mail"
                title="Select a message to read"
                description="Choose a message from the list on the left."
              />
            </div>
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
        selectedAccountId={selectedAccountId}
        summaryState={summaryState}
      />
    </div>
  );
}
