"use client";

import { useCallback, useState, type MouseEvent } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Ellipsis,
  Settings,
  Star,
  StarOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BUILD_SCOPE_TYPE_LABELS } from "@/lib/build/build-scope";
import type { BuildScopeRef } from "./use-build-nav-preferences";

interface BuildScopeRowProps {
  scope: BuildScopeRef;
  isCurrent: boolean;
  isStarred: boolean;
  isArchived?: boolean;
  itemRole?: "option" | "treeitem";
  settingsHref: string | null;
  onSelect: (scope: BuildScopeRef) => void;
  onToggleStar: (scope: BuildScopeRef) => void;
}

function scopeInitials(scope: BuildScopeRef): string {
  const source = scope.projectKey ?? scope.name;
  return source.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "BD";
}

export function BuildScopeRow({
  scope,
  isCurrent,
  isStarred,
  isArchived = false,
  itemRole = "option",
  settingsHref,
  onSelect,
  onToggleStar,
}: BuildScopeRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const secondary = [scope.parentPath, scope.projectKey]
    .filter((value): value is string => value !== null && value.length > 0)
    .join(" · ");

  const accessibleLabel = [
    scope.name,
    BUILD_SCOPE_TYPE_LABELS[scope.type],
    secondary.length > 0 ? secondary : null,
    isCurrent ? "current" : null,
    isArchived ? "archived" : null,
  ]
    .filter((part): part is string => part !== null)
    .join(", ");

  const handleSelect = useCallback(() => onSelect(scope), [onSelect, scope]);

  const handleToggleStar = useCallback(() => {
    onToggleStar(scope);
    setMenuOpen(false);
  }, [onToggleStar, scope]);

  const handleContextMenu = useCallback((event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setMenuOpen(true);
  }, []);

  const handleOpenInNewTab = useCallback(() => {
    setMenuOpen(false);
  }, []);

  return (
    <div
      className={cn(
        "group/scope flex items-center gap-1 rounded-md pr-1 transition-colors motion-reduce:transition-none",
        isCurrent ? "bg-muted" : "hover:bg-muted/70",
        isArchived && "opacity-60",
      )}
      onContextMenu={handleContextMenu}
    >
      <button
        type="button"
        role={itemRole}
        aria-selected={itemRole === "option" ? isCurrent : undefined}
        aria-label={accessibleLabel}
        data-scope-key={scope.key}
        onClick={handleSelect}
        className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left md:min-h-0"
      >
        <span
          aria-hidden
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-micro font-bold text-primary"
        >
          {scopeInitials(scope)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <TruncatedText
            text={scope.name}
            className="text-label font-medium text-foreground"
          />
          <span className="flex items-center gap-1 text-micro text-muted-foreground">
            <span className="shrink-0">
              {BUILD_SCOPE_TYPE_LABELS[scope.type]}
            </span>
            {secondary.length > 0 ? (
              <TruncatedText text={secondary} className="min-w-0 flex-1" />
            ) : null}
          </span>
        </span>
        {isArchived ? (
          <Badge variant="outline" className="h-4 shrink-0 px-1.5 py-0 text-micro">
            Archived
          </Badge>
        ) : null}
        {isCurrent ? (
          <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
        ) : null}
      </button>

      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Actions for ${scope.name}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground motion-reduce:transition-none max-md:opacity-100 md:h-6 md:w-6 md:opacity-0 focus-visible:opacity-100 group-hover/scope:opacity-100 data-[state=open]:opacity-100"
          >
            <Ellipsis className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={handleSelect}>Open</DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href={scope.href}
              target="_blank"
              rel="noreferrer"
              onClick={handleOpenInNewTab}
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              Open in new tab
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleToggleStar}>
            {isStarred ? (
              <StarOff className="h-3.5 w-3.5" />
            ) : (
              <Star className="h-3.5 w-3.5" />
            )}
            {isStarred ? "Remove star" : "Star scope"}
          </DropdownMenuItem>
          {settingsHref ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={settingsHref} onClick={handleOpenInNewTab}>
                  <Settings className="h-3.5 w-3.5" />
                  Settings
                </Link>
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
