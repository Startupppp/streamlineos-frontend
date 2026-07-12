"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useReducedMotion, motion } from "framer-motion";
import { Search, MoreHorizontal, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyClientsIllustration } from "@/components/illustrations";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { fadeUp } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { useClientAccounts } from "@/hooks/api/crm/clients";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { formatAmount, formatDate } from "@/features/crm/clients/utils";
import type { ClientAccountStatus, ClientAccount } from "@/types/crm";

const STATUS_LABELS: Record<ClientAccountStatus, string> = {
  ACCOUNT_OPENING: "Account Opening",
  QUERIES: "Queries",
  PLAN_SELECTED: "Plan Selected",
  INVESTED: "Invested",
};

const STATUS_BADGE_CLASSES: Record<ClientAccountStatus, string> = {
  ACCOUNT_OPENING: "bg-blue-50 text-blue-700 border-blue-200",
  QUERIES: "bg-amber-50 text-amber-700 border-amber-200",
  PLAN_SELECTED: "bg-muted text-muted-foreground border-border",
  INVESTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const ALL_STATUSES: ClientAccountStatus[] = [
  "ACCOUNT_OPENING",
  "QUERIES",
  "PLAN_SELECTED",
  "INVESTED",
];

function StatusBadge({ status }: { status: ClientAccountStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn("text-[9px] px-1.5 py-0 h-4", STATUS_BADGE_CLASSES[status])}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}

function ClientRowActions({ account }: { account: ClientAccount }) {
  function handleTriggerClick(e: React.MouseEvent) {
    e.stopPropagation();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleTriggerClick}
          aria-label="Row actions"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/crm/clients/${account.id}`}>View Details</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/crm/leads/${account.leadId}`}>
            <ExternalLink className="h-3.5 w-3.5 mr-2" />
            View Lead
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const COLUMNS: DataTableColumn<ClientAccount>[] = [
  {
    key: "name",
    header: "Client Name",
    sortable: true,
    sortValue: (a) => a.clientName,
    cell: (a) => (
      <div className="flex items-center gap-2 min-w-0">
        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold text-muted-foreground shrink-0">
          {(a.clientName[0] ?? "?").toUpperCase()}
        </div>
        <span className="font-medium truncate max-w-[140px]">{a.clientName}</span>
      </div>
    ),
  },
  {
    key: "email",
    header: "Email",
    cell: (a) => (
      <span className="text-muted-foreground truncate block max-w-[160px]">
        {a.clientEmail ?? "—"}
      </span>
    ),
  },
  {
    key: "phone",
    header: "Phone",
    cell: (a) => <span className="text-muted-foreground">{a.clientPhone ?? "—"}</span>,
  },
  {
    key: "status",
    header: "Status",
    cell: (a) => <StatusBadge status={a.status} />,
  },
  {
    key: "salesRep",
    header: "Sales Rep",
    cell: (a) => <span className="text-muted-foreground">{a.salesRep?.name ?? "—"}</span>,
  },
  {
    key: "investment",
    header: "Investment",
    headerClassName: "text-right",
    className: "text-right",
    cell: (a) => (
      <span className="font-mono tabular-nums">{formatAmount(a.investmentAmount)}</span>
    ),
  },
  {
    key: "investedAt",
    header: "Invested At",
    cell: (a) => (
      <span className="text-muted-foreground">{formatDate(a.investedAt)}</span>
    ),
  },
  {
    key: "actions",
    header: "",
    headerClassName: "w-8",
    className: "w-8",
    cell: (a) => <ClientRowActions account={a} />,
  },
];

export default function ClientsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const shouldReduceMotion = useReducedMotion();

  const [rawSearch, setRawSearch] = useState(searchParams.get("q") ?? "");
  const debouncedSearch = useDebouncedValue(rawSearch, 300);

  const statusParam = searchParams.get("status") as ClientAccountStatus | null;
  const page = Number(searchParams.get("page")) || 1;

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  const { data, isLoading, isError, refetch } = useClientAccounts({
    search: debouncedSearch || undefined,
    status: statusParam ?? undefined,
    page,
    limit: 20,
  });

  const totalCount = data?.totalCount ?? 0;

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setRawSearch(e.target.value);
      updateParams({ q: e.target.value || null, page: null });
    },
    [updateParams],
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      updateParams({ status: value === "all" ? null : value, page: null });
    },
    [updateParams],
  );

  const handleClearFilters = useCallback(() => {
    setRawSearch("");
    updateParams({ q: null, status: null, page: null });
  }, [updateParams]);

  const handleRetry = useCallback(() => void refetch(), [refetch]);

  const handlePageChange = useCallback(
    (newPage: number) =>
      updateParams({ page: newPage <= 1 ? null : String(newPage) }),
    [updateParams],
  );

  const handleRowClick = useCallback(
    (account: ClientAccount) => router.push(`/crm/clients/${account.id}`),
    [router],
  );

  const hasFilters = Boolean(debouncedSearch || statusParam);

  const emptyState = (
    <EmptyState
      illustration={<EmptyClientsIllustration />}
      title={hasFilters ? "No results" : "No clients yet"}
      description={
        hasFilters
          ? "No clients match your filters."
          : "Clients are created when a lead is converted."
      }
      action={
        hasFilters
          ? { label: "Clear filters", onClick: handleClearFilters }
          : undefined
      }
      className="min-h-[40vh] border-0 bg-transparent"
    />
  );

  const contentVariants = shouldReduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.15 } } }
    : fadeUp;

  return (
    <PageWrapper
      title="Clients"
      subtitle={isLoading ? undefined : `${totalCount} accounts`}
      filters={
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-2">
          <div className="relative min-w-0 flex-1 lg:max-w-[240px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={rawSearch}
              onChange={handleSearchChange}
              className="h-8 w-full min-w-0 pl-8 text-xs"
            />
          </div>
          <Select value={statusParam ?? "all"} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-8 text-xs w-[160px] min-w-0 shrink-0">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      {isError ? (
        <ErrorState
          title="Failed to load clients"
          description="An error occurred while loading client accounts. Please try again."
          onRetry={handleRetry}
          className="min-h-[50vh]"
        />
      ) : (
        <motion.div
          variants={contentVariants}
          initial="hidden"
          animate="visible"
        >
          <DataTable
            data={data?.accounts ?? []}
            columns={COLUMNS}
            getRowKey={(a) => a.id}
            isLoading={isLoading}
            onRowClick={handleRowClick}
            emptyState={emptyState}
            pagination={{
              mode: "server",
              page,
              pageSize: 20,
              total: totalCount,
              onPageChange: handlePageChange,
            }}
            minWidth="700px"
          />
        </motion.div>
      )}
    </PageWrapper>
  );
}
