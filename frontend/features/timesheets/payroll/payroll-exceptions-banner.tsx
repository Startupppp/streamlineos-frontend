"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PayrollExceptionsBannerProps {
  pendingApprovalCount: number;
  pendingApprovalHours: number;
  pendingUserCount: number;
}

export function PayrollExceptionsBanner({
  pendingApprovalCount,
  pendingApprovalHours,
  pendingUserCount,
}: PayrollExceptionsBannerProps) {
  if (pendingApprovalCount === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30 px-4 py-3">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
      <p className="flex-1 text-xs text-amber-800 dark:text-amber-300">
        <span className="font-semibold">{pendingApprovalCount} entries</span>{" "}
        ({pendingApprovalHours.toFixed(1)} h) from{" "}
        <span className="font-semibold">{pendingUserCount} people</span> await approval and are
        excluded from payroll.
      </p>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-100 shrink-0 dark:border-amber-500/30 dark:text-amber-300 dark:hover:bg-amber-500/10"
        asChild
      >
        <Link href="/timesheets/team">Review timesheets</Link>
      </Button>
    </div>
  );
}
