"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format, endOfMonth, startOfMonth } from "date-fns";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCan } from "@/hooks/api/access";
import { GenerateInvoiceSheet } from "./generate-invoice-sheet";

function currentMonthStart(): string {
  return format(startOfMonth(new Date()), "yyyy-MM-dd");
}

function currentMonthEnd(): string {
  return format(endOfMonth(new Date()), "yyyy-MM-dd");
}

export function GenerateInvoiceLauncher() {
  const canInvoiceTime = useCan("timesheets:billing:invoice");
  const canCreateInvoice = useCan("accounting:create");
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();

  const startDate = searchParams.get("startDate") ?? currentMonthStart();
  const endDate = searchParams.get("endDate") ?? currentMonthEnd();
  const projectIdParam = searchParams.get("projectId");
  const projectIdRaw = projectIdParam === null ? NaN : parseInt(projectIdParam, 10);
  const projectId = Number.isNaN(projectIdRaw) ? null : projectIdRaw;

  const handleOpen = useCallback(() => setOpen(true), []);

  if (!canInvoiceTime || !canCreateInvoice) return null;

  return (
    <>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={handleOpen}>
        <FileSpreadsheet className="h-3.5 w-3.5" />
        Generate invoice
      </Button>
      {open ? (
        <GenerateInvoiceSheet
          open={open}
          onOpenChange={setOpen}
          startDate={startDate}
          endDate={endDate}
          projectId={projectId}
        />
      ) : null}
    </>
  );
}
