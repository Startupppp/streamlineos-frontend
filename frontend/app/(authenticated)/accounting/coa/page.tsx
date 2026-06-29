"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Calculator } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ListToolbar, LoadingState, ErrorState } from "@/components/shared";
import { useAccounts } from "@/hooks/api/accounting";
import type { AccountType } from "@/types/accounting";
import { CreateAccountDialog } from "@/features/accounting/create-account-dialog";

type TabValue = "ALL" | Accou

const TAB_VALUES: ReadonlyArray<TabValue> = [
  "ALL",
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "INCOME",
  "EXPENSE",
];

const TAB_LABELS: Record<TabValue, string> = {
  ALL: "All",
  ASSET: "Assets",
  LIABILITY: "Liabilities",
  EQUITY: "Equity",
  INCOME: "Income",
  EXPENSE: "Expense",
};

const TYPE_BADGE_CLASSES: Record<AccountType, string> = {
  ASSET: "border-blue-500/30 text-blue-700 bg-blue-500/5",
  LIABILITY: "border-orange-500/30 text-orange-700 bg-orange-500/5",
  EQUITY: "border-violet-500/30 text-violet-700 bg-violet-500/5",
  INCOME: "border-emerald-500/30 text-emerald-700 bg-emerald-500/5",
  EXPENSE: "border-amber-500/30 text-amber-700 bg-amber-500/5",
};

function isTabValue(value: string): value is TabValue {
  return (TAB_VALUES as ReadonlyArray<string>).includes(value);
}

export default function ChartOfAccountsPage() {
  const [tab, setTab] = useState<TabValue>("ALL");
  const [search, setSearch] = useState<string>("");
  const [createOpen, setCreateOpen] = useState<boolean>(false);

  const query = useAccounts({
    page: 1,
    pageSize: 100,
    q: search ? search : undefined,
    type: tab === "ALL" ? undefined : tab,
  });

  function handleTabChange(value: string): void {
    if (isTabValue(value)) {
      setTab(value);
    }
  }

  function handleSearchChange(value: string): void {
    setSearch(value);
  }

  function handleOpenCreate(): void {
    setCreateOpen(true);
  }

  function handleCloseCreate(open: boolean): void {
    setCreateOpen(open);
  }

  function handleRetry(): void {
    void query.refetch();
  }

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  return (
    <PageWrapper
      eyebrow="Accounting"
      title="Chart of Accounts"
      subtitle="Manage ledger accounts grouped by type."
      badge={`${total}`}
      actions={
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New account
        </Button>
      }
    >
      <div className="space-y-4">
        <Tabs value={tab} onValueChange={handleTabChange}>
          <TabsList>
            {TAB_VALUES.map((value) => (
              <TabsTrigger key={value} value={value}>
                {TAB_LABELS[value]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <ListToolbar
          search={search}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search by code or name..."
        />

        {query.isLoading ? (
          <LoadingState variant="table" rows={8} />
        ) : query.error ? (
          <ErrorState
            title="Failed to load accounts"
            description={query.error.message}
            onRetry={handleRetry}
          />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-14 px-6 text-center">
            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-blue-500/10 text-blue-600 mb-3">
              <Calculator className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              No accounts found
            </h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              {search || tab !== "ALL"
                ? "Try a different filter or search term."
                : "Create your first ledger account to get started."}
            </p>
            <Button size="sm" className="mt-4" onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New account
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-card overflow-x-auto">
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-[140px]">Type</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono text-xs">
                      {account.code}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/accounting/coa/${account.id}`}
                        className="text-sm font-medium text-foreground hover:text-blue-600 hover:underline"
                      >
                        {account.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={TYPE_BADGE_CLASSES[account.accountType]}
                      >
                        {account.accountType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={account.isActive ? "default" : "secondary"}
                      >
                        {account.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <CreateAccountDialog open={createOpen} onOpenChange={handleCloseCreate} />
    </PageWrapper>
  );
}
