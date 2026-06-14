"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

interface DealExportRow {
  name: string;
  value: string;
  stage: string;
  probability: string;
  contactPerson: string;
  contactEmail: string;
  assignedTo: string;
  expectedClose: string;
  createdAt: string;
}

interface DealExportItem {
  name: string;
  value?: string | number | null;
  stage: string;
  probability?: number | null;
  contactPerson?: string | null;
  contactEmail?: string | null;
  assignedTo?: { name?: string | null } | null;
  expectedCloseDate?: string | null;
  createdAt?: string | null;
}

export function useDealsExport(deals: DealExportItem[] | undefined) {
  const handleExport = useCallback(async () => {
    try {
      const { downloadXlsx } = await import("@/lib/export/xlsx-utils");
      const rows: DealExportRow[] = (deals || []).map((d) => ({
        name: d.name,
        value: d.value ? String(d.value) : "0",
        stage: d.stage,
        probability: `${d.probability ?? 0}%`,
        contactPerson: d.contactPerson || "",
        contactEmail: d.contactEmail || "",
        assignedTo: d.assignedTo?.name || "Unassigned",
        expectedClose: d.expectedCloseDate || "",
        createdAt: d.createdAt
          ? new Date(d.createdAt).toLocaleDateString()
          : "",
      }));
      await downloadXlsx("deals-export.xlsx", [
        {
          name: "Deals",
          columns: [
            { header: "Deal Name", key: "name", width: 25 },
            { header: "Value (INR)", key: "value", width: 15 },
            { header: "Stage", key: "stage", width: 14 },
            { header: "Probability", key: "probability", width: 12 },
            { header: "Contact Person", key: "contactPerson", width: 20 },
            { header: "Contact Email", key: "contactEmail", width: 25 },
            { header: "Assigned To", key: "assignedTo", width: 18 },
            { header: "Expected Close", key: "expectedClose", width: 14 },
            { header: "Created", key: "createdAt", width: 12 },
          ],
          rows,
        },
      ]);
      toast.success("Deals exported");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [deals]);

  return handleExport;
}
