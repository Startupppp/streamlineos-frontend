"use client";

import Link from "next/link";
import { Landmark } from "lucide-react";
import { Money } from "@/features/accounting/shared";
import type { BankAccountSummary } from "@/hooks/api/accounting/overview";

interface BankAccountsListProps {
  accounts: BankAccountSummary[];
}

export function BankAccountsList({ accounts }: BankAccountsListProps) {
  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center gap-2">
        <Landmark className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">No bank accounts connected</p>
        <Link href="/accounting/banking" className="text-xs text-blue-600 hover:underline">
          Add account
        </Link>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {accounts.map((acct) => (
        <div key={acct.id} className="flex items-center justify-between py-2.5 px-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-md bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
              <Landmark className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm text-foreground truncate">{acct.name}</span>
          </div>
          <Money value={Number(acct.balance)} compact className="text-sm font-medium" />
        </div>
      ))}
    </div>
  );
}
