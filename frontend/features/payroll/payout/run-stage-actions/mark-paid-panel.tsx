"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Props {
  runId: number;
  status: string;
}

export function MarkPaidPanel({ runId, status }: Props) {
  if (status !== "LOCKED") return null;

  return (
    <div className="bg-muted/40 border border-border rounded-lg p-3 flex items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">
        Payroll is locked and ready for bank transfers.
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href={`/payroll/bank-transfers?runId=${runId}`}>Go to Bank Transfers →</Link>
      </Button>
    </div>
  );
}
