"use client";

import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  DollarSign,
  Clock,
  BarChart3,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatINR, formatINRCompact } from "@/lib/format-utils";
import type { ExpensePageData } from "@/server/actions/expense-query";

/* ─── Admin Stats (4-card grid) ─── */

interface AdminExpenseStatsProps {
  stats: ExpensePageData["stats"] | null | undefined;
  pendingCount: number;
}

export function AdminExpenseStats({ stats, pendingCount }: AdminExpenseStatsProps) {
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
      <Card className="shadow-sm hover:shadow-md transition-shadow border">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-xs sm:text-sm text-muted-foreground font-medium">Pending Approval</span>
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
              <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold">{pendingCount}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Awaiting review</p>
        </CardContent>
      </Card>

      <Popover>
        <PopoverTrigger asChild>
          <Card className="shadow-sm hover:shadow-md transition-shadow border cursor-pointer">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-xs sm:text-sm text-muted-foreground font-medium">Approved Today</span>
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold truncate">{formatINRCompact(stats?.approvedAmount || 0)}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Approved today</p>
            </CardContent>
          </Card>
        </PopoverTrigger>
        <PopoverContent className="w-auto px-4 py-3" align="start">
          <p className="text-xs text-muted-foreground mb-1">Exact Amount</p>
          <p className="text-lg font-bold text-foreground">{formatINR(stats?.approvedAmount || 0)}</p>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Card className="shadow-sm hover:shadow-md transition-shadow border cursor-pointer">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-xs sm:text-sm text-muted-foreground font-medium">Rejected Today</span>
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                  <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold truncate">{formatINRCompact(stats?.rejectedAmount || 0)}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Rejected today</p>
            </CardContent>
          </Card>
        </PopoverTrigger>
        <PopoverContent className="w-auto px-4 py-3" align="start">
          <p className="text-xs text-muted-foreground mb-1">Exact Amount</p>
          <p className="text-lg font-bold text-foreground">{formatINR(stats?.rejectedAmount || 0)}</p>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Card className="shadow-sm hover:shadow-md transition-shadow border col-span-2 lg:col-span-1 cursor-pointer">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-xs sm:text-sm text-muted-foreground font-medium">Total Claimed (Month)</span>
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                  <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-bold truncate">
                {formatINRCompact(
                  (stats?.approvedAmount || 0) +
                  (stats?.pendingAmount || 0) +
                  (stats?.rejectedAmount || 0) +
                  (stats?.paidAmount || 0)
                )}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">This month total</p>
            </CardContent>
          </Card>
        </PopoverTrigger>
        <PopoverContent className="w-auto px-4 py-3" align="start">
          <p className="text-xs text-muted-foreground mb-1">Exact Amount</p>
          <p className="text-lg font-bold text-foreground">
            {formatINR(
              (stats?.approvedAmount || 0) +
              (stats?.pendingAmount || 0) +
              (stats?.rejectedAmount || 0) +
              (stats?.paidAmount || 0)
            )}
          </p>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ─── Member Stats (3-card grid) ─── */

interface MemberExpenseStatsProps {
  stats: ExpensePageData["stats"] | null | undefined;
}

export function MemberExpenseStats({ stats }: MemberExpenseStatsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <Card className="shadow-sm hover:shadow-md transition-shadow border">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
              <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-[11px] font-medium bg-muted px-2 py-1 rounded text-muted-foreground">YTD</span>
          </div>
          <p className="text-sm font-medium text-muted-foreground">Total Reimbursed</p>
          <Popover>
            <PopoverTrigger asChild>
              <p className="text-2xl sm:text-3xl font-bold mt-1 truncate cursor-pointer hover:text-primary transition-colors">
                {formatINRCompact((stats?.approvedAmount || 0) + (stats?.paidAmount || 0))}
              </p>
            </PopoverTrigger>
            <PopoverContent className="w-auto px-4 py-3" align="start">
              <p className="text-xs text-muted-foreground mb-1">Exact Amount</p>
              <p className="text-lg font-bold">{formatINR((stats?.approvedAmount || 0) + (stats?.paidAmount || 0))}</p>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      <Card className="shadow-sm hover:shadow-md transition-shadow border">
        <CardContent className="p-4 sm:p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-gold/10 rounded-lg">
              <Clock className="h-5 w-5 text-gold" />
            </div>
            <span className="text-[11px] font-medium bg-muted px-2 py-1 rounded text-muted-foreground">Current</span>
          </div>
          <p className="text-sm font-medium text-muted-foreground">Pending Approval</p>
          <Popover>
            <PopoverTrigger asChild>
              <p className="text-2xl sm:text-3xl font-bold mt-1 truncate cursor-pointer hover:text-primary transition-colors">
                {formatINRCompact(stats?.pendingAmount || 0)}
              </p>
            </PopoverTrigger>
            <PopoverContent className="w-auto px-4 py-3" align="start">
              <p className="text-xs text-muted-foreground mb-1">Exact Amount</p>
              <p className="text-lg font-bold">{formatINR(stats?.pendingAmount || 0)}</p>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      <Card className="shadow-sm hover:shadow-md transition-shadow border">
        <CardContent className="p-4 sm:p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <XCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
            </div>
            <span className="text-[11px] font-medium bg-muted px-2 py-1 rounded text-muted-foreground">Last 30 Days</span>
          </div>
          <p className="text-sm font-medium text-muted-foreground">Rejected Claims</p>
          <Popover>
            <PopoverTrigger asChild>
              <p className="text-2xl sm:text-3xl font-bold mt-1 truncate cursor-pointer hover:text-primary transition-colors">
                {formatINRCompact(stats?.rejectedAmount || 0)}
              </p>
            </PopoverTrigger>
            <PopoverContent className="w-auto px-4 py-3" align="start">
              <p className="text-xs text-muted-foreground mb-1">Exact Amount</p>
              <p className="text-lg font-bold">{formatINR(stats?.rejectedAmount || 0)}</p>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>
    </div>
  );
}
