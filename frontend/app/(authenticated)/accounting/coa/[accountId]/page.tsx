"use client";

import { use, useState, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, Pencil, BookOpen } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { LoadingState, ErrorState } from "@/components/shared";

import {
  useAccounts,
  useJournal,
} from "@/hooks/api/accounting";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import type {
  JournalEntry,
  JournalEntryStatus,
} from "@/types/accounting";
import { formatShortDate } from "@/lib/date-utils";
import { EditAccountDialog } from "@/features/accounting/edit-account-dialog";
import { AccountSummaryCard } from "@/features/accounting/account-summary-card";

interface AccountDetailPageProps {
  params: Promise<{ accountId: string }>;
}

const STATUS_VARIANT: Record<
  JournalEntryStatus,
  "default" | "secondary" | "destructive"
> = {
  POSTED: "default",
  DRAFT: "secondary",
  VOID: "destructive",
  PENDING_APPROVAL: "secondary",
};

export default function AccountDetailPage({ params }: AccountDetailPageProps) {
  const canUpdateAccount = useCan("accounting:accounts:update");
  const canManageJournal = useCan("accounting:journal:manage");
  const { accountId: accountIdStr } = use(params);
  const accountId = Number.parseInt(accountIdStr, 10);

  const [editOpen, setEditOpen] = useState(false);

  const accountsQuery = useAccounts({ limit: 100 });
  const journalQuery = useJournal({ limit: 20 });

  const account = Number.isInteger(accountId)
    ? accountsQuery.data?.data.find((item) => item.id === accountId)
    : undefined;

  const parentAccount = account?.parentAccountId
    ? accountsQuery.data?.data.find(
        (item) => item.id === account.parentAccountId,
      )
    : undefined;

  const handleOpenEdit = useCallback(() => {
    setEditOpen(true);
  }, []);

  const handleEditOpenChange = useCallback((open: boolean) => {
    setEditOpen(open);
  }, []);

  const handleRetry = useCallback(() => {
    void accountsQuery.refetch();
    void journalQuery.refetch();
  }, [accountsQuery, journalQuery]);

  const journalEntries = journalQuery.data?.data ?? [];

  const journalColumns: DataTableColumn<JournalEntry>[] = [
    {
      key: "entryNumber",
      header: "Entry #",
      cell: (entry) => (
        <span className="font-mono text-xs text-foreground">
          {entry.entryNumber}
        </span>
      ),
    },
    {
      key: "entryDate",
      header: "Date",
      cell: (entry) => (
        <span className="text-sm text-foreground tabular-nums">
          {formatShortDate(entry.entryDate)}
        </span>
      ),
    },
    {
      key: "description",
      header: "Description",
      className: "max-w-[280px] truncate",
      cell: (entry) => (
        <span className="text-sm text-muted-foreground">
          {entry.description ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (entry) => (
        <Badge variant={STATUS_VARIANT[entry.status]}>{entry.status}</Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[60px] text-right",
      cell: (entry) => (
        <Link
          href={`/accounting/journal/${entry.id}`}
          className="text-xs text-primary hover:underline whitespace-nowrap"
        >
          View
        </Link>
      ),
    },
  ];

  return (
    <PageWrapper
      title={account ? account.name : "Account"}
      subtitle={account ? `Code ${account.code}` : "Loading account details…"}
      actions={
        <div className="flex items-center gap-2">
          {account && canUpdateAccount && (
            <Button variant="outline" size="sm" onClick={handleOpenEdit}>
              <Pencil className="mr-1 h-4 w-4" />
              Edit
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link href="/accounting/coa">
              <ChevronLeft className="mr-1 h-4 w-4" />
              Chart of accounts
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {accountsQuery.isLoading ? (
          <LoadingState variant="form" rows={8} />
        ) : accountsQuery.error ? (
          <ErrorState
            title="Failed to load account"
            description={getErrorMessage(accountsQuery.error)}
            onRetry={handleRetry}
          />
        ) : !account || !Number.isInteger(accountId) ? (
          <div className="flex flex-1 h-full flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-16 px-6 text-center">
            <h3 className="text-sm font-semibold text-foreground">
              Account not found
            </h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              This account does not exist or you do not have access to it.
            </p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/accounting/coa">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back to chart of accounts
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <AccountSummaryCard account={account} parentAccount={parentAccount} />

            <Card>
              <CardHeader className="px-5 py-4 pb-0">
                <CardTitle className="text-sm font-semibold text-foreground">
                  Recent journal activity
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Recent activity across all accounts
                </p>
              </CardHeader>
              <CardContent className="p-0 pt-3">
                {journalQuery.isLoading ? (
                  <div className="px-5 pb-5">
                    <LoadingState variant="table" rows={12} />
                  </div>
                ) : journalQuery.error ? (
                  <div className="px-5 pb-5">
                    <ErrorState
                      compact
                      title="Failed to load journal entries"
                      description={getErrorMessage(journalQuery.error)}
                      onRetry={handleRetry}
                    />
                  </div>
                ) : journalEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                    <BookOpen className="w-8 text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No journal entries yet.
                    </p>
                    {canManageJournal && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        asChild
                      >
                        <Link href="/accounting/journal/new">New entry</Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="px-0">
                    <DataTable
                      data={journalEntries}
                      columns={journalColumns}
                      getRowKey={(row) => row.id}
                      minWidth="560px"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {account && canUpdateAccount && (
        <EditAccountDialog
          account={account}
          open={editOpen}
          onOpenChange={handleEditOpenChange}
        />
      )}
    </PageWrapper>
  );
}
