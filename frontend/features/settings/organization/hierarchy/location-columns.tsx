"use client";

import { Pencil, Archive, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import type { OrgLocation } from "@/types/org-hierarchy";
import { TypeBadge } from "./location-form";

interface LocationColumnHandlers {
  canManage: boolean;
  onEdit: (location: OrgLocation) => void;
  onArchive: (location: OrgLocation) => void;
  onRestore: (location: OrgLocation) => void;
}

export function buildLocationColumns({
  canManage,
  onEdit,
  onArchive,
  onRestore,
}: LocationColumnHandlers): DataTableColumn<OrgLocation>[] {
  return [
    {
      key: "name",
      header: "Name",
      cell: (l) => <span className="font-medium">{l.name}</span>,
    },
    {
      key: "type",
      header: "Type",
      cell: (l) => <TypeBadge type={l.type} />,
    },
    {
      key: "address",
      header: "Address",
      cell: (l) => (
        <span className="text-muted-foreground max-w-[250px] truncate block">
          {l.address ?? "—"}
        </span>
      ),
      className: "max-w-[250px]",
    },
    {
      key: "status",
      header: "Status",
      cell: (l) => (
        <Badge
          variant={l.status === "ACTIVE" ? "outline" : "secondary"}
          className={cn(
            "h-4 px-1.5 py-0 text-micro",
            l.status === "ACTIVE"
              ? "text-status-success-ink border-status-success-rule bg-status-success-surface"
              : l.status === "ARCHIVED"
                ? "text-status-warning-ink border-status-warning-rule bg-status-warning-surface"
                : "",
          )}
        >
          {l.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-28",
      cell: (l) =>
        canManage ? <div className="flex items-center gap-1">
          {l.status === "ARCHIVED" ? (
            <Button variant="ghost" size="sm" onClick={() => onRestore(l)} title="Restore" aria-label="Restore">
              <RotateCcw className="h-4 w-4 text-primary" />
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => onEdit(l)} title="Edit" aria-label="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onArchive(l)} title="Archive" aria-label="Archive">
                <Archive className="h-4 w-4 text-muted-foreground" />
              </Button>
            </>
          )}
        </div> : null,
    },
  ];
}
