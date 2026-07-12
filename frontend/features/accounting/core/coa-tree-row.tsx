"use client";

import { ChevronRight, MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDeactivateAccount, useActivateAccount, useDeleteAccount } from "@/hooks/api/accounting/core";
import type { AccountTreeNode } from "@/hooks/api/accounting/core";

const TYPE_BADGE_CLASSES: Record<string, string> = {
  ASSET: "border-blue-500/30 text-blue-700 bg-blue-500/5",
  LIABILITY: "border-orange-500/30 text-orange-700 bg-orange-500/5",
  EQUITY: "border-blue-500/30 text-blue-700 bg-blue-500/5",
  INCOME: "border-emerald-500/30 text-emerald-700 bg-emerald-500/5",
  EXPENSE: "border-amber-500/30 text-amber-700 bg-amber-500/5",
};

interface CoaTreeRowProps {
  node: AccountTreeNode;
  depth: number;
  isExpanded: boolean;
  hasChildren: boolean;
  onToggle: (id: number) => void;
  onEdit: (node: AccountTreeNode) => void;
}

export function CoaTreeRow({ node, depth, isExpanded, hasChildren, onToggle, onEdit }: CoaTreeRowProps) {
  const deactivate = useDeactivateAccount(node.id);
  const activate = useActivateAccount(node.id);
  const deleteAccount = useDeleteAccount(node.id);

  function handleToggle(): void {
    onToggle(node.id);
  }

  function handleEdit(): void {
    onEdit(node);
  }

  function handleToggleActive(): void {
    if (node.isActive) {
      deactivate.mutate(undefined, {
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    } else {
      activate.mutate(undefined, {
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    }
  }

  function handleDelete(): void {
    deleteAccount.mutate(undefined, {
      onSuccess: () => toast.success("Account deleted"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  const indentStyle = { paddingLeft: `${depth * 16 + 12}px` };
  const typeClass = TYPE_BADGE_CLASSES[node.accountType] ?? "border-slate-200 text-slate-600 bg-slate-50";
  const isPending = deactivate.isPending || activate.isPending || deleteAccount.isPending;

  return (
    <tr className={cn("border-b border-border/50 hover:bg-muted/30", !node.isActive && "opacity-60")}>
      <td className="font-mono text-xs px-3 py-2 w-[120px]">{node.code}</td>
      <td className="px-3 py-2" style={indentStyle}>
        <div className="flex items-center gap-1.5 min-w-0">
          {hasChildren ? (
            <button
              type="button"
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              onClick={handleToggle}
            >
              <ChevronRight
                className={cn("h-3.5 w-3.5 transition-transform duration-150", isExpanded && "rotate-90")}
              />
            </button>
          ) : (
            <span className="w-3.5 shrink-0" />
          )}
          <span className={cn("text-sm font-medium truncate", !node.isActive && "text-muted-foreground")}>
            {node.name}
          </span>
        </div>
      </td>
      <td className="px-3 py-2 w-[140px]">
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", typeClass)}>
          {node.accountType}
        </Badge>
      </td>
      <td className="px-3 py-2 w-[100px]">
        <Badge variant={node.isActive ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
          {node.isActive ? "Active" : "Inactive"}
        </Badge>
      </td>
      <td className="px-3 py-2 w-[48px] text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6" disabled={isPending}>
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={handleEdit}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggleActive} disabled={isPending}>
              <Power className="mr-2 h-3.5 w-3.5" />
              {node.isActive ? "Deactivate" : "Activate"}
            </DropdownMenuItem>
            {!node.isSystem && !node.hasActivity && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={isPending}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}
