"use client";

import { useCallback, useState } from "react";
import { Download } from "lucide-react";
import type { DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import type { BuildToolbarFilter } from "./build-list-toolbar-layout";
import { BuildFilterSelect } from "./build-filter-select";
import { BuildMobileCard } from "./build-mobile-card";

export interface GalleryRow {
  id: number;
  key: string;
  name: string;
  status: string;
  owner: { firstName: string; lastName: string };
  progress: number;
  target: string;
}

export const ROWS: GalleryRow[] = Array.from({ length: 14 }, (_, index) => ({
  id: index + 1,
  key: `PRJ-${100 + index}`,
  name: `Atlas migration workstream ${index + 1}`,
  status:
    index % 3 === 0 ? "Active" : index % 3 === 1 ? "On hold" : "Completed",
  owner:
    index % 2 === 0
      ? { firstName: "Priya", lastName: "Nair" }
      : { firstName: "Daniel", lastName: "Okafor" },
  progress: (index * 7) % 100,
  target: `2026-1${index % 2}-0${(index % 8) + 1}`,
}));

export const COLUMNS: DataTableColumn<GalleryRow>[] = [
  {
    key: "key",
    header: "Key",
    cell: (row) => <span className="font-mono tabular-nums">{row.key}</span>,
  },
  { key: "name", header: "Name", cell: (row) => row.name },
  { key: "status", header: "Status", cell: (row) => row.status },
  {
    key: "owner",
    header: "Owner",
    cell: (row) => `${row.owner.firstName} ${row.owner.lastName}`,
  },
  {
    key: "progress",
    header: "Progress",
    cell: (row) => (
      <span className="font-mono tabular-nums">{row.progress}%</span>
    ),
  },
  { key: "target", header: "Target", cell: (row) => row.target },
];

export const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
];
export const HEALTH_OPTIONS = [
  { value: "all", label: "All health" },
  { value: "at_risk", label: "At risk" },
];
export const LEAD_OPTIONS = [
  { value: "all", label: "All leads" },
  { value: "priya", label: "Priya Nair" },
];

export function getRowKey(row: GalleryRow) {
  return row.id;
}

export function renderMobileCard(row: GalleryRow) {
  return (
    <BuildMobileCard
      eyebrow={row.key}
      title={row.name}
      status={<span className="text-label">{row.status}</span>}
      person={{ user: row.owner, role: "Owner" }}
      meta={[
        { label: "Progress", value: `${row.progress}%` },
        { label: "Target", value: row.target },
      ]}
      actions={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Actions for ${row.name}`}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
        </Button>
      }
    />
  );
}

export function useGalleryFilters(count: number): BuildToolbarFilter[] {
  const [status, setStatus] = useState("all");
  const [health, setHealth] = useState("all");
  const [lead, setLead] = useState("all");

  const handleStatusChange = useCallback((v: string) => setStatus(v), []);
  const handleHealthChange = useCallback((v: string) => setHealth(v), []);
  const handleLeadChange = useCallback((v: string) => setLead(v), []);

  const all: BuildToolbarFilter[] = [
    {
      id: "status",
      label: "Status",
      active: status !== "all",
      control: (
        <BuildFilterSelect
          label="Status"
          value={status}
          onValueChange={handleStatusChange}
          options={STATUS_OPTIONS}
        />
      ),
    },
    {
      id: "health",
      label: "Health",
      active: health !== "all",
      control: (
        <BuildFilterSelect
          label="Health"
          value={health}
          onValueChange={handleHealthChange}
          options={HEALTH_OPTIONS}
        />
      ),
    },
    {
      id: "lead",
      label: "Lead",
      active: lead !== "all",
      control: (
        <BuildFilterSelect
          label="Lead"
          value={lead}
          onValueChange={handleLeadChange}
          options={LEAD_OPTIONS}
        />
      ),
    },
  ];
  return all.slice(0, count);
}
