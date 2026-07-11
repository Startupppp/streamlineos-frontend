"use client";

import { Link2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface SourceRef {
  table: string;
  id: number | string;
}

interface SourceRefsPopoverProps {
  refs: SourceRef[] | null | undefined;
}

export function SourceRefsPopover({ refs }: SourceRefsPopoverProps) {
  if (!refs || refs.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700">
          <Link2 className="h-3 w-3" />
          <span className="sr-only">View source records</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <p className="text-xs font-medium text-muted-foreground mb-2">Source records</p>
        <div className="space-y-1">
          {refs.map((ref, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="font-mono text-muted-foreground">{ref.table}</span>
              <span className="font-mono text-slate-700">#{String(ref.id)}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
