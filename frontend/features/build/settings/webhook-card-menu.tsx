"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Ellipsis } from "lucide-react";

interface WebhookCardMenuProps {
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  canManage: boolean;
  hasSecret: boolean;
  isActive: boolean;
  onCopyUrl: () => void;
  onEdit?: () => void;
  onRotateSecret?: () => void;
  rotatePending: boolean;
  onToggleActive?: () => void;
}

export function WebhookCardMenu({
  menuOpen,
  onMenuOpenChange,
  canManage,
  hasSecret,
  isActive,
  onCopyUrl,
  onEdit,
  onRotateSecret,
  rotatePending,
  onToggleActive,
}: WebhookCardMenuProps) {
  return (
    <DropdownMenu open={menuOpen} onOpenChange={onMenuOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Webhook actions"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-opacity hover:bg-muted opacity-0 focus-visible:opacity-100 group-hover/card:opacity-100 data-[state=open]:opacity-100"
        >
          <Ellipsis className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={onCopyUrl}>Copy URL</DropdownMenuItem>
        {canManage && onEdit && (
          <DropdownMenuItem onSelect={onEdit}>Edit</DropdownMenuItem>
        )}
        {canManage && hasSecret && (
          <DropdownMenuItem onSelect={onRotateSecret} disabled={rotatePending}>
            Rotate Secret
          </DropdownMenuItem>
        )}
        {canManage && onToggleActive && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onToggleActive}>
              {isActive ? "Disable" : "Enable"}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
