"use client";

import { useCallback, useEffect, useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import {
  CHAT_SEARCH_SCOPES,
  chatSearchScopeLabel,
  type ChatSearchScope,
} from "./chat-search-scope";

interface ChannelSidebarSearchScopesProps {
  value: ChatSearchScope;
  onChange: (scope: ChatSearchScope) => void;
}

function nextScope(current: ChatSearchScope, direction: 1 | -1): ChatSearchScope {
  const index = CHAT_SEARCH_SCOPES.indexOf(current);
  const count = CHAT_SEARCH_SCOPES.length;
  return CHAT_SEARCH_SCOPES[(index + direction + count) % count];
}

export function ChannelSidebarSearchScopes({
  value,
  onChange,
}: ChannelSidebarSearchScopesProps) {
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const group = groupRef.current;
    if (!group?.contains(document.activeElement)) return;
    group.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
  }, [value]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        onChange(nextScope(value, 1));
        return;
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        onChange(nextScope(value, -1));
      }
    },
    [onChange, value],
  );

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label="Search in"
      className="flex gap-0.5 overflow-x-auto"
      onKeyDown={handleKeyDown}
    >
      {CHAT_SEARCH_SCOPES.map((scope) => (
        <ScopeOption
          key={scope}
          scope={scope}
          selected={value === scope}
          onChange={onChange}
        />
      ))}
    </div>
  );
}

function ScopeOption({
  scope,
  selected,
  onChange,
}: {
  scope: ChatSearchScope;
  selected: boolean;
  onChange: (scope: ChatSearchScope) => void;
}) {
  const handleSelect = useCallback(() => onChange(scope), [onChange, scope]);
  const label = chatSearchScopeLabel(scope);

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      onClick={handleSelect}
      className={cn(
        "inline-flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        selected
          ? "bg-primary text-primary-foreground"
          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
