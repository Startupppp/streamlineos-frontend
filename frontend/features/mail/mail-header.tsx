"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
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
import { Settings, PenSquare, Mail } from "lucide-react";
import { SparklesIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useMailMessages } from "@/hooks/api/mail";
import type { MailAccount } from "@/types/mail";

const SENTINEL = "__all__";

interface MailHeaderProps {
  accounts: MailAccount[];
  accountsLoading: boolean;
  selectedAccountId: number | "all";
  canAi: boolean;
  onAccountChange: (value: string) => void;
  onCompose: () => void;
  onSummarize: () => void;
  onOpenAccounts: () => void;
}

export function MailHeader({
  accounts,
  accountsLoading,
  selectedAccountId,
  canAi,
  onAccountChange,
  onCompose,
  onSummarize,
  onOpenAccounts,
}: MailHeaderProps) {
  const reduceMotion = useReducedMotion();
  const { iconRef: sparklesRef, hoverHandlers: sparklesHover } =
    useAnimatedIcon();
  const hasAccounts = accounts.length > 0;

  const { data: inboxData } = useMailMessages({
    folder: "inbox",
    accountId: selectedAccountId,
    limit: 40,
  });

  const unreadCount = useMemo(() => {
    const messages = inboxData?.pages.flatMap((p) => p.messages) ?? [];
    return messages.filter((m) => !m.isRead).length;
  }, [inboxData]);

  const accountLabel =
    selectedAccountId === "all"
      ? "All accounts"
      : (accounts.find((a) => a.id === selectedAccountId)?.accountEmail ??
        accounts.find((a) => a.id === selectedAccountId)?.accountLabel ??
        "Account");

  return (
    <header className="shrink-0 border-b border-border/50 bg-card/70 backdrop-blur-sm">
      <div className="flex items-center gap-2 px-3 py-1.5 min-w-0">
        <motion.div
          className="flex items-center gap-2 min-w-0 shrink-0"
          initial={reduceMotion ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/15 shrink-0">
            <Mail className="h-3.5 w-3.5" aria-hidden />
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <h1 className="text-sm font-semibold tracking-tight text-foreground leading-none">
              Mail
            </h1>
            {hasAccounts && unreadCount > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-primary/10 px-1.5 text-micro font-semibold tabular-nums text-foreground border border-primary/15">
                {unreadCount}
                <span className="sr-only"> unread in loaded inbox</span>
              </span>
            ) : null}
          </div>
        </motion.div>

        <div className="flex-1 min-w-0" />

        <div className="flex items-center gap-1 shrink-0 min-w-0">
          {accountsLoading ? (
            <Skeleton className="h-8 w-24 rounded-md" />
          ) : hasAccounts ? (
            <Select
              value={
                selectedAccountId === "all"
                  ? SENTINEL
                  : String(selectedAccountId)
              }
              onValueChange={onAccountChange}
            >
              <SelectTrigger
                className={cn(
                  "h-8 w-auto max-w-[8rem] sm:max-w-[11rem] lg:max-w-[13rem]",
                  "border-transparent bg-transparent shadow-none text-dense gap-1 px-2",
                  "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  "focus:ring-0 data-[state=open]:bg-muted/50",
                )}
                aria-label={`Account: ${accountLabel}`}
              >
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

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={onOpenAccounts}
            aria-label="Mail account settings"
          >
            <Settings className="h-3.5 w-3.5" aria-hidden />
          </Button>

          <div className="mx-0.5 h-4 w-px bg-border/70 shrink-0" aria-hidden />

          {canAi && hasAccounts ? (
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/60 bg-transparent px-2 sm:px-2.5 text-dense font-medium text-foreground/85 transition-colors hover:bg-muted/60 hover:border-border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onClick={onSummarize}
              aria-label="What needs me — AI inbox triage"
              {...sparklesHover}
            >
              <SparklesIcon ref={sparklesRef} size={13} />
              <span className="hidden md:inline">What needs me</span>
            </button>
          ) : null}

          <Button
            variant="default"
            size="sm"
            className="h-8 text-dense gap-1.5 px-2.5 sm:px-3"
            onClick={onCompose}
            disabled={!hasAccounts}
            aria-label="Compose"
          >
            <PenSquare className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Compose</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

export { SENTINEL as MAIL_ACCOUNT_SENTINEL };
