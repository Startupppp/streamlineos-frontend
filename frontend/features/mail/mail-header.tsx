"use client";

import {
  Settings,
  PenSquare,
  Mail,
  UsersRound,
  ChevronDown,
  Clock3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PAGE_CHROME_X } from "@/components/ui/content-fill-panel";
import { Badge } from "@/components/ui/badge";
import { MailDailyBrief } from "./mail-daily-brief";
import { MAIL_COMPOSE_FAB_CLASS } from "./mail-presentation";
import type { MailInboxSummaryState } from "./use-mail-inbox-summary";
import type { MailAccount } from "@/types/mail";
import { useUnifiedInboxCount } from "@/hooks/api/inbox";

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
  onOpenRecent?: () => void;
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
  onOpenRecent,
}: MailHeaderProps) {
  const hasAccounts = accounts.length > 0;
  const { data: inboxCount } = useUnifiedInboxCount({ enabled: hasAccounts });
  const unreadCount = hasAccounts ? (inboxCount?.mail ?? 0) : 0;
  const accountLabel =
    selectedAccountId === "all"
      ? "All accounts"
      : (accounts.find((account) => account.id === selectedAccountId)
          ?.accountEmail ??
        accounts.find((account) => account.id === selectedAccountId)
          ?.accountLabel ??
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
              <h1 className="text-base font-semibold leading-tight tracking-tight text-foreground sm:text-lg">
                Mail
              </h1>
              {unreadCount > 0 && (
                <Badge
                  variant="default"
                  className="rounded-full px-2 py-0.5 text-xs font-medium"
                >
                  {unreadCount}
                </Badge>
              )}
            </div>
            <p className="hidden text-label leading-snug text-muted-foreground xl:block">
              Messages and follow-ups across your connected accounts
            </p>
          </div>
        </div>

        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1">
          {hasAccounts && onOpenRecent ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 lg:hidden"
              onClick={onOpenRecent}
              aria-label="Open recent mail"
            >
              <Clock3 className="size-4" aria-hidden="true" />
            </Button>
          ) : null}
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="size-9 gap-1 px-0 md:h-9 md:w-auto md:max-w-44 md:px-2.5 lg:max-w-52"
                  aria-label={`Switch mail account. Current: ${accountLabel}`}
                >
                  <UsersRound className="size-4 shrink-0" aria-hidden="true" />
                  <span className="hidden min-w-0 truncate md:block">
                    {accountLabel}
                  </span>
                  <ChevronDown
                    className="hidden size-3.5 shrink-0 opacity-60 md:block"
                    aria-hidden="true"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Mail account</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={
                    selectedAccountId === "all"
                      ? SENTINEL
                      : String(selectedAccountId)
                  }
                  onValueChange={onAccountChange}
                >
                  <DropdownMenuRadioItem value={SENTINEL}>
                    All accounts
                  </DropdownMenuRadioItem>
                  {accounts.map((account) => (
                    <DropdownMenuRadioItem
                      key={account.id}
                      value={String(account.id)}
                    >
                      <span className="truncate">
                        {account.accountEmail ??
                          account.accountLabel ??
                          `Account ${account.id}`}
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
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
              className="hidden shrink-0 gap-2 md:inline-flex md:h-9 md:w-auto md:px-3"
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
      {hasAccounts ? (
        <Button
          type="button"
          size="icon"
          className={MAIL_COMPOSE_FAB_CLASS}
          onClick={onCompose}
          disabled={!canCompose}
          aria-label="Compose mail"
        >
          <PenSquare className="size-5" aria-hidden="true" />
        </Button>
      ) : null}
    </header>
  );
}

export { SENTINEL as MAIL_ACCOUNT_SENTINEL };
