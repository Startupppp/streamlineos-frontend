"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import type { DataTableColumn } from "@/components/ui/data-table";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { SlottingRule } from "@/hooks/api/inventory/slotting-labor";
import {
  LOCATION_TYPE_LABELS,
  isLocationType,
} from "@/features/inventory/components/warehouse/location-type-constants";
import { LocationNameCell, ResolvedName } from "./slotting-name-cells";

export interface NameSource {
  names: ReadonlyMap<number, string>;
  isLoading: boolean;
  canRead: boolean;
  deniedNote: string;
}

interface SlottingRuleColumnsOptions {
  canManage: boolean;
  warehouses: NameSource;
  categories: NameSource;
  variants: NameSource;
  locationsReadable: boolean;
  renderActiveControl: (rule: SlottingRule) => ReactNode;
}

function renderFrom(source: NameSource, id: number, missing: string): ReactNode {
  if (!source.canRead)
    return <span className="italic text-muted-foreground">{source.deniedNote}</span>;
  return (
    <ResolvedName name={source.names.get(id)} isLoading={source.isLoading} missing={missing} />
  );
}

function MatchCell({
  rule,
  categories,
  variants,
}: {
  rule: SlottingRule;
  categories: NameSource;
  variants: NameSource;
}) {
  if (rule.matchType === "VELOCITY_CLASS")
    return (
      <span className="text-sm">
        {rule.velocityClass ? (
          `Class ${rule.velocityClass}`
        ) : (
          <span className="italic text-muted-foreground">No class recorded</span>
        )}
      </span>
    );

  if (rule.matchType === "CATEGORY")
    return (
      <span className="text-sm">
        {rule.categoryId === null ? (
          <span className="italic text-muted-foreground">No category recorded</span>
        ) : (
          renderFrom(categories, rule.categoryId, "No longer in the catalogue")
        )}
      </span>
    );

  return (
    <span className="text-sm">
      {rule.productVariantId === null ? (
        <span className="italic text-muted-foreground">No variant recorded</span>
      ) : (
        renderFrom(variants, rule.productVariantId, "No longer in the catalogue")
      )}
    </span>
  );
}

function TargetTypeNote({ locationType }: { locationType: string | null }) {
  if (locationType === null || !isLocationType(locationType)) return null;
  return (
    <p className="text-dense text-muted-foreground">
      {LOCATION_TYPE_LABELS[locationType]} only
    </p>
  );
}

const ACTIVE_BADGE = statusToneClasses("success");
const OFF_BADGE = statusToneClasses("neutral");

export function buildSlottingRuleColumns({
  canManage,
  warehouses,
  categories,
  variants,
  locationsReadable,
  renderActiveControl,
}: SlottingRuleColumnsOptions): DataTableColumn<SlottingRule>[] {
  const columns: DataTableColumn<SlottingRule>[] = [
    {
      key: "name",
      header: "Rule",
      cell: (row) => <span className="text-sm font-medium">{row.name}</span>,
    },
    {
      key: "warehouse",
      header: "Warehouse",
      cell: (row) => (
        <span className="text-sm">
          {renderFrom(warehouses, row.warehouseId, "No longer listed")}
        </span>
      ),
    },
    {
      key: "match",
      header: "Matches",
      cell: (row) => <MatchCell rule={row} categories={categories} variants={variants} />,
    },
    {
      key: "zone",
      header: "Sends to",
      cell: (row) => (
        <div className="min-w-0">
          <LocationNameCell
            warehouseId={row.warehouseId}
            locationId={row.targetZoneLocationId}
            canRead={locationsReadable}
            className="text-sm"
          />
          <TargetTypeNote locationType={row.targetLocationType} />
        </div>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums",
      cell: (row) => row.priority,
    },
    {
      key: "active",
      header: "State",
      headerClassName: "w-[120px]",
      cell: (row) => (
        <div className="flex items-center gap-2">
          {canManage ? renderActiveControl(row) : null}
          <Badge
            variant="outline"
            className={cn(
              "text-dense",
              row.isActive
                ? cn(ACTIVE_BADGE.surface, ACTIVE_BADGE.ink, ACTIVE_BADGE.rule)
                : cn(OFF_BADGE.surface, OFF_BADGE.ink, OFF_BADGE.rule),
            )}
          >
            {row.isActive ? "Active" : "Off"}
          </Badge>
        </div>
      ),
    },
  ];

  return columns;
}
