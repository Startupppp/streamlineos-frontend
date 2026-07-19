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
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useMailAccounts } from "@/hooks/api/mail";
import { useFinalizeIntegrationConnection } from "@/hooks/api/integrations";
import { MailListPane } from "./mail-list-pane";
import { MailAccountsSheet } from "./mail-accounts-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import type { MailMessageSummary } from "@/types/mail";

const SENTINEL = "__all__";

export function MailShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: accounts = [], isLoading: accountsLoading } = useMailAccounts();
  const finalize = useFinalizeIntegrationConnection();
  const finalizeRef = useRef(false);

  const [accountsSheetOpen, setAccountsSheetOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<number | "all">("all");
  const [selectedMessage, setSelectedMessage] = useState<MailMessageSummary | null>(null);
  const [showMobileList, setShowMobileList] = useState(true);

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

  const handleOpenAccountsSheet = useCallback(() => setAccountsSheetOpen(true), []);
  const handleCloseAccountsSheet = useCallback(() => setAccountsSheetOpen(false), []);

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

  return (
    <div className="flex flex-col h-full min-h-0 min-w-0">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 shrink-0 bg-card/50">
        <span className="text-sm font-semibold text-foreground tracking-tight shrink-0">Mail</span>

        {accountsLoading ? (
          <Skeleton className="h-9 w-36 rounded-md" />
        ) : accounts.length > 0 ? (
          <Select
            value={selectedAccountId === "all" ? SENTINEL : String(selectedAccountId)}
            onValueChange={handleAccountChange}
          >
            <SelectTrigger className="h-9 w-auto min-w-[9rem] max-w-[14rem] border-input bg-card text-xs">
              <SelectValue placeholder="All accounts" />
            </SelectTrigger>
            <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
              <SelectItem value={SENTINEL} className="text-xs">All accounts</SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={String(account.id)} className="text-xs">
                  {account.accountEmail ?? account.accountLabel ?? `Account ${account.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          className="h-9 text-xs gap-1.5"
          disabled
          title="Compose — coming in this build"
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
            "flex flex-1 min-h-0 min-w-0 items-center justify-center bg-muted/10",
            showMobileList && "hidden md:flex",
          )}
        >
          {selectedMessage ? (
            <div className="flex flex-col h-full w-full p-4 gap-2">
              <div className="md:hidden">
                <Button variant="ghost" size="sm" onClick={handleBackToList} className="text-xs mb-2">
                  ← Back
                </Button>
              </div>
              <EmptyState
                illustrationPreset="mail"
                title="Reading pane"
                description="The full reading pane arrives in the next wave. Message selected."
              />
            </div>
          ) : (
            <EmptyState
              illustrationPreset="mail"
              title="Select a message to read"
              description="Choose a message from the list on the left."
            />
          )}
        </div>
      </div>

      <MailAccountsSheet open={accountsSheetOpen} onClose={handleCloseAccountsSheet} />
    </div>
  );
}
