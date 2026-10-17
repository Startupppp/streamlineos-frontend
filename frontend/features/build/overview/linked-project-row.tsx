"use client";

import { useCallback, useState } from "react";
import type { MouseEvent } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface LinkedProjectRowProps {
  project: { id: number; name: string; key: string; status?: string | null };
  focused: boolean;
}

export function LinkedProjectRow({ project, focused }: LinkedProjectRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const href = `/build/${project.id}`;

  const handleContextMenu = useCallback((event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setMenuOpen(true);
  }, []);

  const handleCopyLink = useCallback(() => {
    void navigator.clipboard?.writeText(`${window.location.origin}${href}`);
  }, [href]);

  return (
    <div
      aria-selected={focused}
      onContextMenu={handleContextMenu}
      className={cn(
        "flex items-center justify-between gap-2 rounded-md px-1 text-sm transition-colors",
        focused && "bg-accent",
      )}
    >
      <Link href={href} className="truncate text-primary hover:underline">
        {project.name}
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        <span className="font-mono text-dense text-muted-foreground">{project.key}</span>
        {project.status ? (
          <Badge variant="outline" className="h-5 px-2 py-0.5 text-micro">
            {project.status}
          </Badge>
        ) : null}
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Actions for ${project.name}`}
              className="sr-only"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={href}>Open project</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyLink}>Copy link</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
