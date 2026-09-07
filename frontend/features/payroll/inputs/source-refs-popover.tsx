"use client";

import { Link2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface SourceRef {
  table: string;
  id: number | string;
}

function isSourceRef(v: unknown): v is SourceRef {
  return (
    typeof v === "object" &&
    v !== null &&
    "table" in v &&
    "id" in v &&
    typeof v.table === "string"
  );
}

interface SourceRefsPopoverProps {
  refs: unknown;
}

export function SourceRefsPopover({ refs }: SourceRefsPopoverProps) {
  if (!Array.isArray(refs) || refs.length === 0) return null;
  const rows = refs.filter(isSourceRef);
  if (rows.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-primary hover:text-primary/80">
          <Link2 className="h-3 w-3" />
          <span className="sr-only">View source records</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <p className="text-xs font-medium text-muted-foreground mb-2">Source records</p>
        <div className="space-y-1">
          {rows.map((ref, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="font-mono text-muted-foreground">{ref.table}</span>
              <span className="font-mono text-foreground">#{String(ref.id)}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
