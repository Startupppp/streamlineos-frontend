"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Building2, Plus, AlertCircle, CreditCard, Wallet, Landmark } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyTransferIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { Money } from "@/features/accounting/shared";
import { useCan } from "@/hooks/api/access";
import { useBankAccounts } from "@/hooks/api/accounting/banking";
import type { BankAccount, BankAccountType } from "@/hooks/api/accounting/banking";
import { AddBankAccountSheet } from "./add-bank-account-sheet";

const TYPE_ICON: Record<BankAccountType, React.ElementType> = {
  BANK: Landmark,
  CASH: Wallet,
  CARD: CreditCard,
  WALLET: Wallet,
};

const TYPE_LABEL: Record<BankAccountType, string> = {
  BANK: "Bank",
  CASH: "Cash",
  CARD: "Card",
  WALLET: "Wallet",
};

function AccountCard({ account, index }: { account: BankAccount; index: number }) {
  const Icon = TYPE_ICON[account.accountType];
  const balance = parseFloat(account.currentBalance);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.22 }}
    >
      <Link href={`/accounting/banking/${account.id}`}>
        <div className="bg-card border border-border rounded-xl shadow-sm p-4 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{account.name}</p>
                {account.bankName && (
                  <p className="text-[11px] text-muted-foreground truncate">{account.bankName}</p>
                )}
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] shrink-0">
              {TYPE_LABEL[account.accountType]}
            </Badge>
          </div>

          {account.accountNumberMasked && (
            <p className="text-[11px] text-muted-foreground mb-2 font-mono">
              {account.accountNumberMasked}
            </p>
          )}

          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">Balance</p>
              <Money value={balance} currency={account.currency} />
            </div>
            {!account.isActive && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium">Inactive</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div>
            <Skeleton className="h-4 w-28 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-5 w-12" />
      </div>
      <Skeleton className="h-3 w-24 mb-3" />
      <div className="flex items-end justify-between">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

export function BankingHubClient() {
  const [addOpen, setAddOpen] = useState(false);
  const canManage = useCan("accounting:banking:manage");
  const { data, isLoading, isError, error } = useBankAccounts();

  const accounts = data?.items ?? [];

  const totalBalance = accounts.reduce(
    (sum, a) => sum + parseFloat(a.currentBalance),
    0,
  );
  const activeCount = accounts.filter((a) => a.isActive).length;

  function handleAddOpen() {
    setAddOpen(true);
  }

  if (isError) return <ErrorState description={getErrorMessage(error)} />;

  return (
    <PageWrapper
      title="Banking"
      subtitle="Manage bank accounts and reconciliation"
      actions={
        canManage ? (
          <Button size="sm" onClick={handleAddOpen}>
            <Plus className="h-4 w-4 mr-1" />
            Add Account
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-1 min-h-0 flex-col space-y-6">
        <StatCardGrid cols={4}>
          <StatCard
            label="Total Cash Balance"
            value={
              isLoading
                ? "—"
                : new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency: "INR",
                    maximumFractionDigits: 0,
                  }).format(totalBalance)
            }
            icon={Landmark}
            tone="blue"
            isLoading={isLoading}
          />
          <StatCard
            label="Accounts"
            value={isLoading ? "—" : String(accounts.length)}
            icon={Building2}
            tone="default"
            isLoading={isLoading}
          />
          <StatCard
            label="Active Accounts"
            value={isLoading ? "—" : String(activeCount)}
            icon={AlertCircle}
            tone="emerald"
            isLoading={isLoading}
          />
          <StatCard
            label="Reconcile"
            value={isLoading ? "—" : "View"}
            icon={Building2}
            tone="default"
            href="/accounting/banking/reconciliation"
            isLoading={isLoading}
          />
        </StatCardGrid>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <EmptyState
            className="flex-1"
            illustration={<EmptyTransferIllustration className="w-40 h-40 opacity-80" />}
            title="No bank accounts yet"
            description="Add your first bank account to start importing statements and reconciling transactions."
            action={canManage ? { label: "Add your first bank account", onClick: handleAddOpen } : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {accounts.map((account, idx) => (
              <AccountCard key={account.id} account={account} index={idx} />
            ))}
          </div>
        )}
      </div>

      {canManage && (
        <AddBankAccountSheet open={addOpen} onOpenChange={setAddOpen} />
      )}
    </PageWrapper>
  );
}
