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
