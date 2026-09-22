"use client";

import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  ALL_APPROVAL_TABS,
  APPROVALS_TABPANEL_ID,
  APPROVAL_TAB_LABEL,
  type ApprovalTab,
} from "./approvals-tab-panel";

interface ApprovalTabFilterProps {
  value: ApprovalTab;
  onChange: (tab: ApprovalTab) => void;
}

export function ApprovalTabFilter({ value, onChange }: ApprovalTabFilterProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      const index = ALL_APPROVAL_TABS.indexOf(value);
      let next: ApprovalTab | undefined;
      if (event.key === "ArrowRight")
        next = ALL_APPROVAL_TABS[(index + 1) % ALL_APPROVAL_TABS.length];
      else if (event.key === "ArrowLeft")
        next =
          ALL_APPROVAL_TABS[
            (index - 1 + ALL_APPROVAL_TABS.length) % ALL_APPROVAL_TABS.length
          ];
      else if (event.key === "Home") next = ALL_APPROVAL_TABS[0];
      else if (event.key === "End") next = ALL_APPROVAL_TABS.at(-1);
      if (!next) return;

      event.preventDefault();
      onChange(next);
      refs.current[next]?.focus();
    },
    [value, onChange],
  );

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const tab = event.currentTarget.dataset.tab as ApprovalTab | undefined;
      if (tab) onChange(tab);
    },
    [onChange],
  );

  return (
    <div role="tablist" aria-label="Approval status" className="flex items-center gap-1">
      {ALL_APPROVAL_TABS.map((tab) => {
        const active = tab === value;
        return (
          <button
            key={tab}
            ref={(el) => {
              refs.current[tab] = el;
            }}
            type="button"
            role="tab"
            id={`approvals-tab-${tab}`}
            data-tab={tab}
            aria-selected={active}
            aria-controls={APPROVALS_TABPANEL_ID}
            tabIndex={active ? 0 : -1}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            className={cn(
              "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {APPROVAL_TAB_LABEL[tab]}
          </button>
        );
      })}
    </div>
  );
}
