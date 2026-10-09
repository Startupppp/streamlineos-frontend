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
import { toast } from "sonner";
import { useCan } from "@/hooks/api/access";
import { useMailAccounts } from "@/hooks/api/mail";

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
  const accountsQuery = useMailAccounts();
  const accounts = useMemo(
    () => (accountsQuery.data ?? []).filter((account) => account.status === "active"),
    [accountsQuery.data],
  );

  const openCompose = useCallback(() => {
    if (!canCompose) {
      toast.error("You do not have permission to send mail.");
      return;
    }
    if (accountsQuery.isLoading) {
      toast.info("Mail accounts are still loading. Try again in a moment.");
      return;
    }
    if (accounts.length === 0) {
      toast.error("Connect a mail account before composing a message.");
      return;
    }
    setOpen(true);
  }, [accounts.length, accountsQuery.isLoading, canCompose]);

  const closeCompose = useCallback(() => setOpen(false), []);

  useEffect(() => {
    window.addEventListener(OPEN_MAIL_COMPOSER_EVENT, openCompose);
    return () => window.removeEventListener(OPEN_MAIL_COMPOSER_EVENT, openCompose);
  }, [openCompose]);

  const value = useMemo(() => ({ openCompose }), [openCompose]);

  return (
    <MailComposeContext.Provider value={value}>
      {children}
      {open && (
        <MailComposeSheet
          open
          onClose={closeCompose}
          mode={{ type: "compose" }}
          accounts={accounts}
        />
      )}
    </MailComposeContext.Provider>
  );
}
