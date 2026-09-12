"use client";

import { forwardRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMinorMoney } from "@/lib/accounting/money";
import { useBankAccountBalance } from "@/hooks/api/accounting/banking";

interface BankAccountBalanceCellProps {
  bankAccountId: string;
  asOf: string;
}

export const BankAccountBalanceCell = forwardRef<HTMLSpanElement, BankAccountBalanceCellProps>(
  function BankAccountBalanceCell({ bankAccountId, asOf }, ref) {
    const balanceQuery = useBankAccountBalance(bankAccountId, asOf);

    if (balanceQuery.isPending) return <Skeleton className="ml-auto h-4 w-20" />;
    if (balanceQuery.isError || !balanceQuery.data)
      return (
        <span ref={ref} className="text-muted-foreground">
          Unavailable
        </span>
      );

    return (
      <span ref={ref}>
        {formatMinorMoney(balanceQuery.data.balanceMinor, balanceQuery.data.currency)}
      </span>
    );
  },
);
