"use client";

import { useMemo } from "react";
import { Settings, PenSquare, Mail, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAGE_CHROME_X } from "@/components/ui/content-fill-panel";
import { useMailMessages } from "@/hooks/api/mail";
import { MailDailyBrief } from "./mail-daily-brief";
import type { MailInboxSummaryState } from "./use-mail-inbox-summary";
import type { MailAccount } from "@/types/mail";

const SENTINEL = "__all__";

interface MailHeaderProps {
  accounts: MailAccount[];
  accountsLoading: boolean;
  selectedAccountId: number | "all";
  canAi: boolean;
  canCompose?: boolean;
  showAccountSettings?: boolean;
  summaryState: MailInboxSummaryState;
  onAccountChange: (value: string) => void;
  onCompose: () => void;
  onGenerateBrief: () => void;
  onOpenBrief: () => void;
  onOpenAccounts: () => void;
}

export function MailHeader({
  accounts,
  accountsLoading,
  selectedAccountId,
  canAi,
  canCompose = true,
  showAccountSettings = true,
  summaryState,
  onAccountChange,
  onCompose,
  onGenerateBrief,
  onOpenBrief,
  onOpenAccounts,
}: MailHeaderProps) {
  const hasAccounts = accounts.length > 0;
  const { data: inboxData } = useMailMessages(
    { folder: "inbox", accountId: selectedAccountId },
    { enabled: hasAccounts },
  );

  const unreadCount = useMemo(() => {
    const messages = inboxData?.pages.flatMap((page) => page.messages) ?? [];
    return messages.filter((message) => !message.isRead).length;
  }, [inboxData]);

  const accountLabel =
    selectedAccountId === "all"
      ? "All accounts"
      : (accounts.find((account) => account.id === selectedAccountId)?.accountEmail ??
        accounts.find((account) => account.id === selectedAccountId)?.accountLabel ??
        "Account");

  return (
    <header className="shrink-0 border-b border-border bg-background">
      <div
        className={cn(
          "flex min-h-14 min-w-0 items-center gap-2 py-2",
          PAGE_CHROME_X,
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
            <Mail className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="hidden text-base font-semibold leading-tight tracking-tight text-foreground sm:block sm:text-lg">
                Mail
              </h1>
              {hasAccounts && unreadCount > 0 ? (
                <span className="hidden h-5 min-w-5 items-center justify-center rounded-md border border-primary/20 bg-primary/10 px-1.5 text-micro font-medium tabular-nums text-foreground sm:inline-flex">
                  {unreadCount}
                  <span className="sr-only"> unread in loaded inbox</span>
                </span>
              ) : null}
            </div>
            <p className="hidden text-label leading-snug text-muted-foreground xl:block">
              Messages and follow-ups across your connected accounts
            </p>
          </div>
        </div>

        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1">
          {hasAccounts ? (
            <MailDailyBrief
              state={summaryState}
              canAi={canAi}
              onGenerate={onGenerateBrief}
              onDetails={onOpenBrief}
            />
          ) : null}

          {accountsLoading ? (
            <Skeleton className="h-9 w-28 rounded-md" />
          ) : hasAccounts ? (
            <Select
              value={selectedAccountId === "all" ? SENTINEL : String(selectedAccountId)}
              onValueChange={onAccountChange}
            >
              <SelectTrigger
                className="size-9 gap-1 border-input bg-card px-0 text-sm shadow-none md:h-9 md:w-auto md:max-w-36 md:px-2.5 lg:max-w-52"
                aria-label={`Account: ${accountLabel}`}
              >
                <UsersRound className="size-4 shrink-0 md:hidden" aria-hidden="true" />
                <span className="hidden min-w-0 md:block"><SelectValue placeholder="All accounts" /></span>
              </SelectTrigger>
              <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                <SelectItem value={SENTINEL}>All accounts</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={String(account.id)}>
                    {account.accountEmail ?? account.accountLabel ?? `Account ${account.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {showAccountSettings ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 text-muted-foreground"
              onClick={onOpenAccounts}
              aria-label="Mail account settings"
            >
              <Settings className="size-4" aria-hidden="true" />
            </Button>
          ) : null}

          {hasAccounts ? (
            <Button
              size="sm"
              className="size-9 shrink-0 gap-2 px-0 md:h-9 md:w-auto md:px-3"
              onClick={onCompose}
              disabled={!canCompose}
              aria-label="Compose"
            >
              <PenSquare className="size-4" aria-hidden="true" />
              <span className="hidden md:inline">Compose</span>
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export { SENTINEL as MAIL_ACCOUNT_SENTINEL };
