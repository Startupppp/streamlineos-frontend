"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { GalleryCase } from "@/features/build/shared/build-list-gallery-cases";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { CONTENT_FILL_PANEL, PmPageShell, PmSection } from "@/components/pm-chrome";
import { EmptyState } from "@/components/ui/empty-state";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import {
  buildReleasesColumns,
  ReleaseMobileCard,
} from "@/features/build/releases/releases-table-columns";
import type { Release } from "@/types/projects";
import { RELEASE_STATUS_OPTIONS, STUB_RELEASES, STUB_NOOP } from "./planning-surfaces-fixtures";

export function ReleaseListToolbar() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const handleClearAll = useCallback(() => {
    setSearch("");
    setStatus("all");
    setDateRange({ from: "", to: "" });
  }, []);

  return (
    <BuildListToolbar
      search={{
        value: search,
        onValueChange: setSearch,
        placeholder: "Search releases…",
        label: "Search releases",
      }}
      filters={[
        {
          id: "status",
          label: "Status",
          active: status !== "all",
          control: (
            <BuildFilterSelect
              label="Status"
              value={status}
              onValueChange={setStatus}
              options={RELEASE_STATUS_OPTIONS}
            />
          ),
        },
        {
          id: "date-range",
          label: "Date range",
          active: !!dateRange.from || !!dateRange.to,
          control: (
            <DateRangePicker
              from={dateRange.from || undefined}
              to={dateRange.to || undefined}
              onChange={setDateRange}
              placeholder="Filter by release date…"
            />
          ),
        },
      ]}
      onClearAll={handleClearAll}
    />
  );
}

export function ReleaseGalleryWrapper({
  caseId,
  title,
  children,
}: {
  caseId: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <GalleryCase id={caseId} title={title}>
      <PageWrapper
        title="Releases"
        subtitle="Track versions and shipped features"
        actions={
          <BuildHeaderActions
            actions={[{ id: "new", label: "New Release", icon: Plus, primary: true }]}
          />
        }
        filters={<ReleaseListToolbar />}
      >
        <PmPageShell>
          <PmSection index={0} className="flex min-h-0 flex-1 flex-col">
            {children}
          </PmSection>
        </PmPageShell>
      </PageWrapper>
    </GalleryCase>
  );
}

export function ReleasesReadyTable() {
  const columns = buildReleasesColumns({
    canManage: true,
    onEdit: STUB_NOOP,
    onDelete: STUB_NOOP,
  });

  const renderMobileCard = useCallback(
    (row: Release) => (
      <ReleaseMobileCard
        release={row}
        canManage
        onEdit={STUB_NOOP}
        onDelete={STUB_NOOP}
      />
    ),
    [],
  );

  function getRowKey(row: Release) { return row.id; }

  return (
    <BuildListSurface<Release>
      permission="build:view"
      rows={STUB_RELEASES}
      columns={columns}
      isLoading={false}
      isError={false}
      getRowKey={getRowKey}
      mobileCard={renderMobileCard}
      pagination={{ mode: "cursor", pageSize: 25, pageNumber: 1, hasMore: false, hasPrevious: false, onNext: STUB_NOOP, onPrevious: STUB_NOOP }}
      empty={<EmptyState className={CONTENT_FILL_PANEL} illustrationPreset="projects" title="No releases yet" />}
    />
  );
}
