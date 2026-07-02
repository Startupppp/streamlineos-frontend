"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
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
import { SkeletonTable, ErrorState } from "@/components/shared";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { useClientAccounts } from "@/hooks/api/crm/clients";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import type { ClientAccountStatus, ClientAccount } from "@/types/crm";

const STATUS_LABELS: Record<ClientAccountStatus, string> = {
  ACCOUNT_OPENING: "Account Opening",
  QUERIES: "Queries",
  PLAN_SELECTED: "Plan Selected",
  INVESTED: "Invested",
};

const STATUS_COLORS: Record<ClientAccountStatus, string> = {
  ACCOUNT_OPENING: "bg-blue-500/10 text-blue-600 border-0",
  QUERIES: "bg-amber-500/10 text-amber-600 border-0",
  PLAN_SELECTED: "bg-violet-500/10 text-violet-600 border-0",
  INVESTED: "bg-emerald-500/10 text-emerald-600 border-0",
};

const ALL_STATUSES: ClientAccountStatus[] = [
  "ACCOUNT_OPENING",
  "QUERIES",
  "PLAN_SELECTED",
  "INVESTED",
];

function StatusBadge({ status }: { status: ClientAccountStatus }) {
  return (
    <Badge className={cn("text-[10px]", STATUS_COLORS[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

function formatAmount(amount: string | null) {
  if (!amount) return "—";
  const n = parseFloat(amount);
  if (isNaN(n)) return amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function ClientRow({ account }: { account: ClientAccount }) {
  const router = useRouter();

  const handleNavigate = useCallback(
    () => router.push(`/crm/clients/${account.id}`),
    [router, account.id],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") handleNavigate();
    },
    [handleNavigate],
  );

  const handleStopPropagation = useCallback(
    (e: React.MouseEvent) => e.stopPropagation(),
    [],
  );

  return (
    <tr
      className="border-b border-border/50 last:border-0 h-8 hover:bg-muted/30 cursor-pointer transition-colors"
      onClick={handleNavigate}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
    >
      <td className="px-3 py-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 rounded-full bg-violet-500/10 flex items-center justify-center text-[10px] font-semibold text-violet-600 shrink-0">
            {(account.clientName[0] ?? "?").toUpperCase()}
          </div>
          <span className="text-[11px] font-medium truncate max-w-[140px]">
            {account.clientName}
          </span>
        </div>
      </td>
      <td className="px-3 py-1.5 text-[11px] text-muted-foreground truncate max-w-[160px]">
        {account.clientEmail ?? "—"}
      </td>
      <td className="px-3 py-1.5 text-[11px] text-muted-foreground">
        {account.clientPhone ?? "—"}
      </td>
      <td className="px-3 py-1.5">
        <StatusBadge status={account.status} />
      </td>
      <td className="px-3 py-1.5 text-[11px] text-muted-foreground">
        {account.salesRep?.name ?? "—"}
      </td>
      <td className="px-3 py-1.5 text-[11px] tabular-nums">
        {formatAmount(account.investmentAmount)}
      </td>
      <td className="px-3 py-1.5 text-[11px] text-muted-foreground">
        {formatDate(account.investedAt)}
      </td>
      <td className="px-3 py-1.5" onClick={handleStopPropagation}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
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
      </td>
    </tr>
  );
}

export default function ClientsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

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
  const totalPages = data?.totalPages ?? 0;

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setRawSearch(e.target.value);
      updateParams({ q: e.target.value || null, page: null });
    },
    [updateParams],
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      updateParams({
        status: value === "ALL" ? null : value,
        page: null,
      });
    },
    [updateParams],
  );

  const handleRetry = useCallback(() => void refetch(), [refetch]);

  const handlePrevPage = useCallback(
    () => updateParams({ page: page <= 2 ? null : String(page - 1) }),
    [updateParams, page],
  );

  const handleNextPage = useCallback(
    () => updateParams({ page: String(page + 1) }),
    [updateParams, page],
  );

  return (
    <PageWrapper
      title="Clients"
      subtitle={isLoading ? "Loading..." : `${totalCount} accounts`}
      filters={
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={rawSearch}
              onChange={handleSearchChange}
              className="pl-8 h-8 text-xs w-56"
            />
          </div>
          <Select
            value={statusParam ?? "ALL"}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="h-8 text-xs w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
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
      {isLoading ? (
        <SkeletonTable rows={8} columns={8} />
      ) : isError ? (
        <ErrorState
          title="Failed to load clients"
          description="An error occurred while loading client accounts. Please try again."
          onRetry={handleRetry}
          className="min-h-[50vh]"
        />
      ) : (
        <motion.div
          className="space-y-4"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {(data?.accounts.length ?? 0) === 0 ? (
            <EmptyState
              title="No clients found"
              description={
                debouncedSearch || statusParam
                  ? "No clients match your filters."
                  : "Clients are created when a lead is converted."
              }
              className="min-h-[50vh]"
            />
          ) : (
            <motion.div variants={fadeUp}>
              <div className="border border-border rounded-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                      <tr className="border-b border-border">
                        <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                          Client Name
                        </th>
                        <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                          Email
                        </th>
                        <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                          Phone
                        </th>
                        <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                          Status
                        </th>
                        <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                          Sales Rep
                        </th>
                        <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                          Investment
                        </th>
                        <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                          Invested At
                        </th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {data?.accounts.map((account) => (
                        <ClientRow key={account.id} account={account} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={handlePrevPage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={handleNextPage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      )}
    </PageWrapper>
  );
}
