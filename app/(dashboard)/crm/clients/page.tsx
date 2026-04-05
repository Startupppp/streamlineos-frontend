"use client";

import { useCallback, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Search, Users, IndianRupee, FileCheck, ClipboardList,
  ChevronRight, UserPlus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { useClientAccountStats, useClientAccounts } from "@/lib/api/hooks/crm";
import { useDebouncedValue } from "@/hooks/use-debounce";

const STATUSES = ["ACCOUNT_OPENING", "QUERIES", "PLAN_SELECTED", "INVESTED"] as const;

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  ACCOUNT_OPENING: { label: "Account Opening", color: "text-blue-400", bg: "bg-blue-500/10", icon: ClipboardList },
  QUERIES: { label: "Queries", color: "text-amber-400", bg: "bg-amber-500/10", icon: Search },
  PLAN_SELECTED: { label: "Plan Selected", color: "text-purple-400", bg: "bg-purple-500/10", icon: FileCheck },
  INVESTED: { label: "Invested", color: "text-emerald-400", bg: "bg-emerald-500/10", icon: IndianRupee },
};

function formatINR(val: string | number | null | undefined): string {
  if (!val) return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
}

export default function ClientAccountsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const search = searchParams.get("q") || "";
  const debouncedSearch = useDebouncedValue(search, 300);
  const statusFilter = searchParams.get("status") || "all";
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

  const setSearch = useCallback((q: string) => updateParams({ q: q || null, page: null }), [updateParams]);
  const setStatusFilter = useCallback((s: string) => updateParams({ status: s === "all" ? null : s, page: null }), [updateParams]);
  const setPage = useCallback((p: number) => updateParams({ page: p === 1 ? null : String(p) }), [updateParams]);

  const { data: stats, isLoading: statsLoading } = useClientAccountStats();
  const { data, isLoading } = useClientAccounts({
    status: statusFilter !== "all" ? statusFilter as typeof STATUSES[number] : undefined,
    search: debouncedSearch || undefined,
    page,
    limit: 25,
  });

  const accounts = data?.accounts ?? [];

  return (
    <PageWrapper
      title="Client Accounts"
      subtitle="Post-conversion client management — track account opening through investment"
      filters={
        <>
          <div className="relative flex-1 max-w-sm min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Stages</SelectItem>
              {STATUSES.map(s => (
                <SelectItem key={s} value={s} className="text-xs">{STATUS_CONFIG[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      }
    >
      <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="visible">
      {/* Stats */}
      <motion.div variants={fadeUp} className="grid gap-4 grid-cols-2 md:grid-cols-5">
        {[
          { label: "Total", value: stats?.total ?? 0, icon: Users, color: "text-foreground" },
          { label: "Account Opening", value: stats?.accountOpening ?? 0, icon: ClipboardList, color: "text-blue-400" },
          { label: "Queries", value: stats?.queries ?? 0, icon: Search, color: "text-amber-400" },
          { label: "Plan Selected", value: stats?.planSelected ?? 0, icon: FileCheck, color: "text-purple-400" },
          { label: "Invested", value: stats?.invested ?? 0, icon: IndianRupee, color: "text-emerald-400" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <s.icon className={cn("h-5 w-5", s.color)} />
                <span className={cn("text-2xl font-bold tabular-nums", s.color)}>
                  {statsLoading ? <Skeleton className="h-7 w-8" /> : s.value}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Table */}
      <motion.div variants={fadeUp}>
        <Card>
          <ScrollArea className="w-full" type="auto">
            <div className="min-w-max">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Client</TableHead>
                  <TableHead className="text-xs">Phone</TableHead>
                  <TableHead className="text-xs">Stage</TableHead>
                  <TableHead className="text-xs">Sales Rep</TableHead>
                  <TableHead className="text-xs">CRM Rep</TableHead>
                  <TableHead className="text-xs">Est. Investment</TableHead>
                  <TableHead className="text-xs">Investment</TableHead>
                  <TableHead className="text-xs">Converted</TableHead>
                  <TableHead className="text-xs w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={9} className="h-12">
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm font-medium text-foreground">No client accounts</p>
                      <p className="text-xs mt-1">Convert leads to CONVERTED status to create client accounts.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map((account) => {
                    const config = STATUS_CONFIG[account.status] || STATUS_CONFIG.ACCOUNT_OPENING;
                    return (
                      <TableRow key={account.id} className="hover:bg-muted/40">
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{account.clientName}</p>
                            <p className="text-xs text-muted-foreground">{account.clientEmail || "—"}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {account.clientPhone || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-[10px] border-0", config.bg, config.color)}>
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {account.salesRep ? (
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={account.salesRep.image || ""} />
                                <AvatarFallback className="text-[8px]">{account.salesRep.name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs truncate max-w-[80px]">{account.salesRep.name}</span>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {account.assignedCrm ? (
                            <div className="flex items-center gap-1.5">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={account.assignedCrm.image || ""} />
                                <AvatarFallback className="text-[8px]">{account.assignedCrm.name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs truncate max-w-[80px]">{account.assignedCrm.name}</span>
                            </div>
                          ) : <span className="text-xs text-muted-foreground">Unassigned</span>}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {formatINR(account.estimatedInvestment)}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-emerald-400">
                          {account.status === "INVESTED" ? formatINR(account.investmentAmount) : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {account.convertedAt ? new Date(account.convertedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                        </TableCell>
                        <TableCell>
                          <Link href={`/crm/clients/${account.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            </div>
          </ScrollArea>
          {(data?.totalPages ?? 0) > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <span className="text-xs text-muted-foreground">Page {data?.page} of {data?.totalPages}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= (data?.totalPages ?? 1)} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>
      </motion.div>
    </PageWrapper>
  );
}
