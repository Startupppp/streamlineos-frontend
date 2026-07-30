"use client";

import { useState, useCallback, useTransition, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { useReducedMotion, motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
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
import { CONTENT_FILL_PANEL, FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { EmptyClientsIllustration } from "@/components/illustrations";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { fadeUp } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
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
  ACCOUNT_OPENING: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  QUERIES: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  PLAN_SELECTED: "bg-muted text-muted-foreground border-border",
  INVESTED: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
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
        <AnimatedIconButton
          icon={EllipsisIcon}
          variant="ghost"
          size="icon"
          className="w-7"
          onClick={handleTriggerClick}
          aria-label="Row actions"
        />
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
        <TruncatedText text={a.clientName} className="font-medium max-w-[140px]" />
      </div>
    ),
  },
  {
    key: "email",
    header: "Email",
    cell: (a) => a.clientEmail
      ? <TruncatedText text={a.clientEmail} className="text-muted-foreground max-w-[160px] block" />
      : <span className="text-muted-foreground">—</span>,
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

  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (debouncedSearch === current) return;
    updateParams({ q: debouncedSearch || null, page: null });
  }, [debouncedSearch, searchParams, updateParams]);

  const { data, isLoading, isError, refetch } = useClientAccounts({
    search: debouncedSearch.trim() || undefined,
    status: statusParam ?? undefined,
    page,
    limit: 20,
  });

  const totalCount = data?.totalCount ?? 0;

  const handleSearchChange = useCallback((value: string) => {
    setRawSearch(value);
    },
    [],
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
      className={cn(CONTENT_FILL_PANEL, "border-0 bg-transparent")}
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
        <div className={FILTER_TOOLBAR_ROW}>
          <SearchInput placeholder="Search clients..." value={rawSearch} onValueChange={handleSearchChange} />
          <Select value={statusParam ?? "all"} onValueChange={handleStatusChange}>
            <SelectTrigger className={cn(FILTER_SELECT_TRIGGER, "w-[160px] min-w-0")}>
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
          className="flex-1"
        />
      ) : (
        <motion.div
          variants={contentVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col flex-1 min-h-0"
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
            className="flex-1 min-h-0"
          />
        </motion.div>
      )}
    </PageWrapper>
  );
}
