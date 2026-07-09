"use client";

import { useCallback, useTransition, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyActivityIllustration } from "@/components/illustrations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorState } from "@/components/shared";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  type AuditEntityType,
  type AuditAction,
  type AuditFilters,
  useAuditLogs,
  AuditEntryRow,
  AuditLogSkeleton,
} from "@/features/crm/settings/audit-log/audit-entry-row";

export default function CrmAuditLogPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const shouldReduceMotion = useReducedMotion();

  const entityType = (searchParams.get("entityType") ?? "all") as AuditEntityType | "all";
  const action = (searchParams.get("action") ?? "all") as AuditAction | "all";
  const fromDate = searchParams.get("from") ?? "";
  const toDate = searchParams.get("to") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1", 10);

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

  const filters = useMemo<AuditFilters>(
    () => ({
      targetType: entityType !== "all" ? entityType : undefined,
      action: action !== "all" ? action : undefined,
      dateFrom: fromDate || undefined,
      dateTo: toDate || undefined,
      page,
      pageSize: 50,
    }),
    [entityType, action, fromDate, toDate, page],
  );

  const { data, isLoading, isError, refetch } = useAuditLogs(filters);

  const hasActiveFilters = entityType !== "all" || action !== "all" || !!fromDate || !!toDate;

  const handleEntityTypeChange = useCallback(
    (val: string) => updateParams({ entityType: val !== "all" ? val : null, page: null }),
    [updateParams],
  );

  const handleActionChange = useCallback(
    (val: string) => updateParams({ action: val !== "all" ? val : null, page: null }),
    [updateParams],
  );

  const handleFromDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      updateParams({ from: e.target.value || null, page: null }),
    [updateParams],
  );

  const handleToDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      updateParams({ to: e.target.value || null, page: null }),
    [updateParams],
  );

  const handleClearFilters = useCallback(
    () => updateParams({ entityType: null, action: null, from: null, to: null, page: null }),
    [updateParams],
  );

  const handlePrev = useCallback(
    () => updateParams({ page: page > 2 ? String(page - 1) : null }),
    [updateParams, page],
  );

  const handleNext = useCallback(
    () => updateParams({ page: String(page + 1) }),
    [updateParams, page],
  );

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const entries = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const listVariants = shouldReduceMotion ? { hidden: { opacity: 0 }, visible: { opacity: 1 } } : staggerContainer;
  const itemVariants = shouldReduceMotion ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.15 } } } : fadeUp;

  return (
    <PageWrapper
      title="Audit Log"
      subtitle={isLoading ? "Loading..." : `${total.toLocaleString()} entr${total !== 1 ? "ies" : "y"}`}
      filters={
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
          <Select value={entityType} onValueChange={handleEntityTypeChange}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="Entity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              <SelectItem value="lead">Leads</SelectItem>
              <SelectItem value="contact">Contacts</SelectItem>
              <SelectItem value="company">Companies</SelectItem>
              <SelectItem value="deal">Deals</SelectItem>
              <SelectItem value="task">Tasks</SelectItem>
              <SelectItem value="settings">Settings</SelectItem>
            </SelectContent>
          </Select>

          <Select value={action} onValueChange={handleActionChange}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="updated">Updated</SelectItem>
              <SelectItem value="deleted">Deleted</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="status_changed">Status Changed</SelectItem>
              <SelectItem value="stage_changed">Stage Changed</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="merged">Merged</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-1.5">
            <DatePicker value={fromDate ?? ""} onChange={handleFromDateChange} placeholder="Pick a date" className="h-8 w-36 text-xs" />
            <span className="text-xs text-muted-foreground">to</span>
            <DatePicker value={toDate ?? ""} onChange={handleToDateChange} placeholder="Pick a date" className="h-8 w-36 text-xs" />
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleClearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      }
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="loading" variants={itemVariants} initial="hidden" animate="visible" exit={{ opacity: 0 }}>
            <AuditLogSkeleton />
          </motion.div>
        ) : isError ? (
          <motion.div key="error" variants={itemVariants} initial="hidden" animate="visible" exit={{ opacity: 0 }}>
            <ErrorState title="Failed to load audit log" onRetry={handleRetry} />
          </motion.div>
        ) : entries.length === 0 ? (
          <motion.div key="empty" variants={itemVariants} initial="hidden" animate="visible" exit={{ opacity: 0 }}>
            <EmptyState
              className="flex-1 min-h-[50vh] border-0 bg-transparent"
              illustration={<EmptyActivityIllustration />}
              title="No audit entries found"
              description={
                hasActiveFilters
                  ? "No entries match the current filters."
                  : "All CRM changes will appear here."
              }
              action={hasActiveFilters ? { label: "Clear filters", onClick: handleClearFilters } : undefined}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            className="space-y-0"
            variants={listVariants}
            initial="hidden"
            animate="visible"
          >
            {entries.map((entry, idx) => (
              <AuditEntryRow key={entry.id} entry={entry} isLast={idx === entries.length - 1} />
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <Button variant="outline" size="sm" onClick={handlePrev} disabled={page === 1}>
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button variant="outline" size="sm" onClick={handleNext} disabled={page >= totalPages}>
                  Next
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
