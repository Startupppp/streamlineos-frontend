"use client";

import Link from "next/link";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BulkEntityId } from "./bulk-import-entities";

export interface ImportLinkButtonProps {
  entity: BulkEntityId;
  label?: string;
  className?: string;
}

/**
 * The way a list page offers an import.
 *
 * A link, not a trigger. Each of these list pages used to open its own
 * three-step `<Dialog>` — upload, map, review — which is work with a state a
 * person could lose to the Escape key and no URL to come back to. The work
 * moved to `/crm/import`; what stays here is the signpost to it.
 */
export function ImportLinkButton({ entity, label = "Import", className }: ImportLinkButtonProps) {
  return (
    <Button asChild variant="outline" size="sm" className={className}>
      <Link href={`/crm/import?entity=${entity}`}>
        <Upload className="mr-1.5 size-4" aria-hidden />
        {label}
      </Link>
    </Button>
  );
}
