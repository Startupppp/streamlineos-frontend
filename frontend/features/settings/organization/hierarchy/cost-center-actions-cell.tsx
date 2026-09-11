"use client";

import { Pencil, Archive, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OrgCostCenter } from "@/types/org-hierarchy";

interface CostCenterActionsCellProps {
  costCenter: OrgCostCenter;
  onEdit: (cc: OrgCostCenter) => void;
  onArchive: (cc: OrgCostCenter) => void;
  onRestore: (cc: OrgCostCenter) => void;
}

export function CostCenterActionsCell({
  costCenter,
  onEdit,
  onArchive,
  onRestore,
}: CostCenterActionsCellProps) {
  function handleEdit() {
    onEdit(costCenter);
  }
  function handleArchive() {
    onArchive(costCenter);
  }
  function handleRestore() {
    onRestore(costCenter);
  }

  return (
    <div className="flex items-center gap-1">
      {costCenter.status === "ARCHIVED" ? (
        <Button variant="ghost" size="sm" onClick={handleRestore} title="Restore" aria-label="Restore">
          <RotateCcw className="h-4 w-4 text-primary" />
        </Button>
      ) : (
        <>
          <Button variant="ghost" size="sm" onClick={handleEdit} title="Edit" aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleArchive} title="Archive" aria-label="Archive">
            <Archive className="h-4 w-4 text-muted-foreground" />
          </Button>
        </>
      )}
    </div>
  );
}
