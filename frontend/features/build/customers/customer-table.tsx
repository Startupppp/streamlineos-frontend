"use client";

import React, { useCallback, useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import { PmPanel } from "@/components/pm-chrome";
import type { CustomerDisplayPrefs } from "./use-customer-display-prefs";
import {
  type CustomerOrg,
  buildCustomerColumns,
  CustomerMobileCard,
} from "./customer-mobile-card";

interface CustomerTableProps {
  customers: CustomerOrg[];
  prefs: CustomerDisplayPrefs;
  hasPrev: boolean;
  hasNext: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  pageSize: number;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
}

export const CustomerTable = React.memo(function CustomerTable({
  customers,
  prefs,
  hasPrev,
  hasNext,
  onPrevPage,
  onNextPage,
  pageSize,
  isLoading,
  emptyState,
}: CustomerTableProps) {
  const columns = useMemo(() => buildCustomerColumns(prefs), [prefs]);

  const renderMobileCard = useCallback(
    (c: CustomerOrg) => <CustomerMobileCard c={c} />,
    [],
  );

  return (
    <PmPanel className="flex min-h-0 flex-1 flex-col">
      <DataTable
        data={customers}
        columns={columns}
        getRowKey={(c) => c.id}
        isLoading={isLoading}
        rowClassName={() => "group h-10 hover:bg-primary/[0.035]"}
        className="min-h-0 flex-1 rounded-none border-0 bg-transparent shadow-none"
        emptyState={emptyState}
        minWidth="480px"
        mobileCard={renderMobileCard}
        pagination={{
          mode: "cursor",
          pageSize,
          hasMore: hasNext,
          hasPrevious: hasPrev,
          onNext: onNextPage,
          onPrevious: onPrevPage,
        }}
      />
    </PmPanel>
  );
});
