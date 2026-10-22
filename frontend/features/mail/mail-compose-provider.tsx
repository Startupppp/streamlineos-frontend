"use client";

import dynamic from "next/dynamic";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useCan } from "@/hooks/api/access";
import { useMailAccounts } from "@/hooks/api/mail";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MailComposeSheet = dynamic(
  () => import("./mail-compose-sheet").then((module) => module.MailComposeSheet),
  { ssr: false },
);

const OPEN_MAIL_COMPOSER_EVENT = "streamlineos:mail-compose";

interface MailComposeContextValue {
  openCompose: () => void;
}

const MailComposeContext = createContext<MailComposeContextValue | null>(null);

export function openGlobalMailComposer(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPEN_MAIL_COMPOSER_EVENT));
  }
}

export function useGlobalMailComposer(): MailComposeContextValue {
  const value = useContext(MailComposeContext);
  if (!value) {
    throw new Error("useGlobalMailComposer must be used inside MailComposeProvider");
  }
  return value;
}

export function MailComposeProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const canCompose = useCan("mail:messages:send");
  const accountsQuery = useMailAccounts({ enabled: open });
  const accounts = useMemo(
    () => (accountsQuery.data ?? []).filter((account) => account.status === "active"),
    [accountsQuery.data],
  );

  const openCompose = useCallback(() => {
    if (!canCompose) {
      toast.error("You do not have permission to send mail.");
      return;
    }
    setOpen(true);
  }, [canCompose]);

  const closeCompose = useCallback(() => setOpen(false), []);

  useEffect(() => {
    window.addEventListener(OPEN_MAIL_COMPOSER_EVENT, openCompose);
    return () => window.removeEventListener(OPEN_MAIL_COMPOSER_EVENT, openCompose);
  }, [openCompose]);

  const value = useMemo(() => ({ openCompose }), [openCompose]);

  return (
    <MailComposeContext.Provider value={value}>
      {children}
      {open && accounts.length > 0 && (
        <MailComposeSheet
          open
          onClose={closeCompose}
          mode={{ type: "compose" }}
          accounts={accounts}
        />
      )}
      {open && accounts.length === 0 && (
        <Dialog open onOpenChange={(next) => { if (!next) closeCompose(); }}>
          <DialogContent>
            {accountsQuery.isError ? (
              <>
                <DialogHeader>
                  <DialogTitle>Couldn&apos;t load your mail accounts</DialogTitle>
                  <DialogDescription role="alert">{getErrorMessage(accountsQuery.error)}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <LoadingButton isPending={accountsQuery.isFetching} onClick={() => void accountsQuery.refetch()}>
                    Retry
                  </LoadingButton>
                </DialogFooter>
              </>
            ) : accountsQuery.isLoading || (accountsQuery.isPending && accountsQuery.data === undefined) ? (
              <DialogHeader>
                <DialogTitle>New message</DialogTitle>
                <DialogDescription role="status">Loading your mail accounts…</DialogDescription>
              </DialogHeader>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Connect a mail account</DialogTitle>
                  <DialogDescription>
                    Connect Gmail or Outlook to send mail from StreamlineOS.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button asChild>
                    <Link href="/mail" onClick={closeCompose}>Connect a mail account</Link>
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}
    </MailComposeContext.Provider>
  );
}
