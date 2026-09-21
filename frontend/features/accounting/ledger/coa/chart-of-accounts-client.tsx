"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import {
  useBookCurrencies,
  useChartOfAccounts,
} from "@/hooks/api/accounting/ledger";
import { cn } from "@/lib/utils";
import type { AccountNode } from "@/types/accounting/accounting-kernel";
import { ACCOUNT_TYPE_LABELS } from "./account-form-schema";
import { ArchiveAccountDialog } from "./archive-account-dialog";
import { CreateAccountSheet, EditAccountSheet } from "./account-form-sheets";
import {
  flattenAccounts,
  headerAccountOptions,
  type FlatAccount,
} from "./flatten-accounts";

export function ChartOfAccountsClient() {
  const canCreate = useCan("accounting:accounts:create");
  const canUpdate = useCan("accounting:accounts:update");
  const canManage = useCan("accounting:accounts:manage");

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AccountNode | null>(null);
  const [archiving, setArchiving] = useState<AccountNode | null>(null);

  const { data, isLoading, isError, error, refetch } = useChartOfAccounts();

  const pageState = usePageState({
    permission: "accounting:accounts:read",
    isLoading,
    isError,
    error,
  });
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);
  const { data: currencies } = useBookCurrencies();

  const rows = useMemo(() => flattenAccounts(data ?? []), [data]);
  const parentOptions = useMemo(() => headerAccountOptions(rows), [rows]);
  const currencyOptions = useMemo(
    () =>
      (currencies ?? []).map((currency) => ({
        value: currency.currencyCode,
        label: currency.currencyCode,
        sublabel: currency.name,
      })),
    [currencies],
  );

  const columns: DataTableColumn<FlatAccount>[] = [
    {
      key: "code",
      header: "Code",
      className: "font-mono text-dense tabular-nums",
      cell: (row) => row.node.code,
    },
    {
      key: "name",
      header: "Account",
      cell: (row) => (
        <div
          className="flex min-w-0 items-center gap-2"
          style={{ paddingLeft: `${row.depth * 16}px` }}
        >
          <span
            className={cn(
              "truncate",
              row.node.isHeader
                ? "text-dense font-bold uppercase tracking-wider text-muted-foreground"
                : "font-medium",
            )}
          >
            {row.node.name}
          </span>
          {row.node.isHeader ? (
            <Badge
              variant="outline"
              className="h-4 shrink-0 px-1.5 py-0 text-micro"
            >
              Grouping
            </Badge>
          ) : null}
          {row.node.isCash ? (
            <Badge
              variant="outline"
              className="h-4 shrink-0 px-1.5 py-0 text-micro"
            >
              Bank or cash
            </Badge>
          ) : null}
          {!row.node.isActive ? (
            <Badge
              variant="outline"
              className="h-4 shrink-0 px-1.5 py-0 text-micro"
            >
              Switched off
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: "type",
      header: "Kind",
      cell: (row) => (
        <span className="text-muted-foreground">
          {ACCOUNT_TYPE_LABELS[row.node.accountType]}
        </span>
      ),
    },
    {
      key: "currency",
      header: "Currency",
      cell: (row) =>
        row.node.currencyRestriction ? (
          <span className="font-mono text-dense">
            {row.node.currencyRestriction}
          </span>
        ) : (
          <span className="text-muted-foreground">Any</span>
        ),
    },
    {
      key: "actions",
      header: "",
      className: "w-40 text-right",
      headerClassName: "text-right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          {!row.node.isHeader ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-dense"
              asChild
            >
              <Link
                href={`/accounting/general-ledger?accountId=${row.node.id}`}
              >
                Ledger
              </Link>
            </Button>
          ) : null}
          {canUpdate ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-dense"
              onClick={() => setEditing(row.node)}
            >
              Edit
            </Button>
          ) : null}
          {canManage ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-dense text-destructive"
              onClick={() => setArchiving(row.node)}
            >
              Remove
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  if (
    pageState.kind !== "ready" &&
    pageState.kind !== "empty" &&
    pageState.kind !== "loading"
  )
    return (
      <PageWrapper title="Chart of accounts">
        <PageState
          resolution={pageState}
          loading={null}
          onRetry={handleRetry}
          className="flex-1"
        >
          {null}
        </PageState>
      </PageWrapper>
    );

  return (
    <PageWrapper
      title="Chart of accounts"
      subtitle="Every bucket your money can sit in. Grouping rows organise; the rest can be posted to."
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      noInternalScroll
      actions={
        canCreate ? (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-1.5"
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => setCreateOpen(true)}
          >
            New account
          </AnimatedIconButton>
        ) : undefined
      }
    >
      <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
        <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-0">
          <DataTable
            data={rows}
            columns={columns}
            getRowKey={(row) => row.node.id}
            isLoading={isLoading}
            className="min-h-0 flex-1"
            minWidth="900px"
            pagination={{ pageSize: 100 }}
            rowClassName={(row) => (row.node.isHeader ? "bg-muted/40" : "")}
            emptyState={
              <EmptyState
                className="min-h-[40vh] flex-1 border-0 bg-transparent"
                title="No accounts yet"
                description="Turn accounting on and we will seed a chart for your country, then you can add to it."
                action={{
                  label: "Set up accounting",
                  href: "/accounting/setup",
                }}
              />
            }
          />
        </CardContent>
      </Card>

      <CreateAccountSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        parentOptions={parentOptions}
        currencyOptions={currencyOptions}
      />
      <EditAccountSheet
        account={editing}
        onOpenChange={() => setEditing(null)}
        parentOptions={parentOptions}
        currencyOptions={currencyOptions}
      />
      <ArchiveAccountDialog
        account={archiving}
        onOpenChange={() => setArchiving(null)}
      />
    </PageWrapper>
  );
}
