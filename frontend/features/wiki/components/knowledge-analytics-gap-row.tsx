"use client";

import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserCombobox } from "@/components/ui/user-combobox";
import { TruncatedText } from "@/components/ui/truncated-text";
import { propagationShield } from "@/lib/keyboard-activation";
import { KbPlusIcon } from "@/features/wiki/lib/kb-icons";
import type { KbGapRow } from "@/types/kb";

export const GapTableRow = memo(function GapTableRow({
  row,
  onCreatePage,
  isCreating,
  isSelected,
  onSelect,
  onAssign,
  isAssigning,
  onDismiss,
  isDismissing,
  onCreateFix,
  isCreatingFix,
  canCreatePage,
  canManageAnalytics,
}: {
  row: KbGapRow;
  onCreatePage: (q: string) => void;
  isCreating: boolean;
  isSelected: boolean;
  onSelect: (query: string) => void;
  onAssign: (query: string, assigneeUserId: string) => void;
  isAssigning: boolean;
  onDismiss: (query: string, reason: string) => void;
  isDismissing: boolean;
  onCreateFix: (query: string) => void;
  isCreatingFix: boolean;
  canCreatePage: boolean;
  canManageAnalytics: boolean;
}) {
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignValue, setAssignValue] = useState("");
  const [dismissOpen, setDismissOpen] = useState(false);
  const [dismissValue, setDismissValue] = useState("");

  function handleSelectClick() {
    if (row.query) onSelect(row.query);
  }
  function handleCreatePageClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (row.query) onCreatePage(row.query);
  }
  function handleCreateFixClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (row.query) onCreateFix(row.query);
  }
  function handleAssignSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (row.query && assignValue.trim()) {
      onAssign(row.query, assignValue.trim());
      setAssignOpen(false);
      setAssignValue("");
    }
  }
  function handleDismissSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (row.query && dismissValue.trim()) {
      onDismiss(row.query, dismissValue.trim());
      setDismissOpen(false);
      setDismissValue("");
    }
  }
  function handleAssignToggle(e: React.MouseEvent) {
    e.stopPropagation();
    setAssignOpen((o) => !o);
    setDismissOpen(false);
  }
  function handleDismissToggle(e: React.MouseEvent) {
    e.stopPropagation();
    setDismissOpen((o) => !o);
    setAssignOpen(false);
  }
  return (
    <div>
      <div className={`flex items-center gap-3 px-3 py-2 transition-colors ${isSelected ? "bg-muted/60" : "hover:bg-muted/40"}`}>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={handleSelectClick}
          disabled={!row.query}
          aria-expanded={isSelected}
          aria-label={`Gap: ${row.query ?? "(empty)"}`}
        >
          <TruncatedText
            text={row.query ?? "(empty)"}
            className="min-w-0 flex-1 text-sm"
          />
          <span className="text-xs tabular-nums text-muted-foreground shrink-0">
            {row.count}
          </span>
          <span className="text-xs text-muted-foreground shrink-0 w-28 text-right">
            {new Date(row.lastOccurredAt).toLocaleDateString("en", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </button>
        {canManageAnalytics ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="px-2 text-xs gap-1 shrink-0"
              onClick={handleAssignToggle}
              disabled={!row.query}
              type="button"
              aria-label="Assign gap owner"
            >
              Assign
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="px-2 text-xs gap-1 shrink-0"
              onClick={handleDismissToggle}
              disabled={!row.query}
              type="button"
              aria-label="Dismiss gap"
            >
              Dismiss
            </Button>
          </>
        ) : null}
        {canCreatePage ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="px-2 text-xs gap-1 shrink-0"
              onClick={handleCreateFixClick}
              disabled={isCreatingFix || !row.query}
              type="button"
              aria-label="Create fix file for gap"
            >
              <KbPlusIcon className="h-3 w-3" />
              Fix
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="px-2 text-xs gap-1 shrink-0"
              onClick={handleCreatePageClick}
              disabled={isCreating || !row.query}
              type="button"
            >
              <KbPlusIcon className="h-3 w-3" />
              Page
            </Button>
          </>
        ) : null}
      </div>
      {assignOpen && (
        <form
          onSubmit={handleAssignSubmit}
          {...propagationShield}
          className="flex items-center gap-2 px-3 py-2 bg-muted/20 border-t border-border/40"
        >
          <UserCombobox
            value={assignValue}
            onChange={setAssignValue}
            placeholder="Select member…"
            className="flex-1"
          />
          <Button
            size="sm"
            type="submit"
            disabled={isAssigning || !assignValue.trim()}
            className="h-7 px-2 text-xs"
          >
            Assign
          </Button>
          <Button
            size="sm"
            type="button"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => {
              setAssignOpen(false);
              setAssignValue("");
            }}
          >
            Cancel
          </Button>
        </form>
      )}
      {dismissOpen && (
        <form
          onSubmit={handleDismissSubmit}
          {...propagationShield}
          className="flex items-center gap-2 px-3 py-2 bg-muted/20 border-t border-border/40"
        >
          <Input
            className="h-7 text-xs flex-1"
            placeholder="Reason for dismissal"
            value={dismissValue}
            onChange={(e) => setDismissValue(e.target.value)}
            autoFocus
          />
          <Button
            size="sm"
            type="submit"
            disabled={isDismissing || !dismissValue.trim()}
            className="h-7 px-2 text-xs"
          >
            Dismiss
          </Button>
          <Button
            size="sm"
            type="button"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => {
              setDismissOpen(false);
              setDismissValue("");
            }}
          >
            Cancel
          </Button>
        </form>
      )}
    </div>
  );
});
