"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Check, Loader2, Plus } from "lucide-react";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useCreateOrgLabel } from "@/hooks/api/build/tickets";
import { useCan } from "@/hooks/api/access";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { DEFAULT_LABEL_COLOR } from "@/components/labels/label-colors";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import type { TicketLabel } from "@/types/projects";

interface LabelsSearchCommandProps {
  labels: TicketLabel[];
  selectedIds: number[];
  onToggle: (labelId: number) => void;
  onCreated: (label: TicketLabel) => void;
  open?: boolean;
}

export function LabelsSearchCommand({
  labels,
  selectedIds,
  onToggle,
  onCreated,
  open = true,
}: LabelsSearchCommandProps) {
  const [query, setQuery] = useState("");
  const canCreate = useCan("build:manage");
  const queryClient = useQueryClient();
  const trimmed = query.trim();

  const exactMatch = useMemo(
    () =>
      trimmed.length === 0
        ? undefined
        : labels.find((label) => label.name.toLowerCase() === trimmed.toLowerCase()),
    [labels, trimmed],
  );

  const filtered = useMemo(() => {
    if (!trimmed) return labels;
    const q = trimmed.toLowerCase();
    return labels.filter((label) => label.name.toLowerCase().includes(q));
  }, [labels, trimmed]);

  const showCreate = canCreate && trimmed.length > 0 && exactMatch === undefined;

  const createLabel = useCreateOrgLabel({
    onSuccess: (newLabel) => {
      queryClient.setQueriesData<TicketLabel[]>(
        { queryKey: [...queryKeys.projects.all, "labels"] },
        (old) => {
          if (!old) return [newLabel];
          if (old.some((label) => label.id === newLabel.id)) return old;
          return [...old, newLabel].sort((a, b) => a.name.localeCompare(b.name));
        },
      );
      setQuery("");
      onCreated(newLabel);
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  function handleCreate() {
    if (!showCreate || createLabel.isPending) return;
    createLabel.mutate({ name: trimmed, color: DEFAULT_LABEL_COLOR });
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;

    if (!trimmed) {
      event.preventDefault();
      return;
    }

    if (exactMatch) {
      event.preventDefault();
      onToggle(exactMatch.id);
      return;
    }

    if (filtered.length === 0 && showCreate) {
      event.preventDefault();
      handleCreate();
    }
  }

  function makeToggleHandler(labelId: number) {
    return function toggleLabel() {
      onToggle(labelId);
    };
  }

  return (
    <Command shouldFilter={false}>
      <CommandInput
        placeholder="Search labels…"
        className="h-8 py-1.5 text-xs"
        value={query}
        onValueChange={setQuery}
        onKeyDown={handleSearchKeyDown}
      />
      <CommandList className="max-h-40">
        {filtered.length === 0 && !showCreate ? (
          <p className="py-2 text-center text-xs text-muted-foreground">
            {trimmed ? "No labels found." : "No labels available."}
          </p>
        ) : null}
        <CommandGroup>
          {filtered.map((label) => {
            const active = selectedIds.includes(label.id);
            return (
              <CommandItem
                key={label.id}
                value={label.name}
                onSelect={makeToggleHandler(label.id)}
              >
                <span
                  className="mr-2 h-2.5 w-2.5 shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: label.color ?? undefined }}
                />
                <span className="min-w-0 flex-1 truncate text-left text-xs">{label.name}</span>
                {active ? <Check className="ml-auto h-3 w-3 shrink-0" /> : null}
              </CommandItem>
            );
          })}
          {showCreate ? (
            <CommandItem
              value={`__create__${trimmed}`}
              onSelect={handleCreate}
              disabled={createLabel.isPending}
              className="gap-2 text-xs text-foreground data-[selected=true]:bg-primary/10"
            >
              {createLabel.isPending ? (
                <Loader2 className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" />
              ) : (
                <Plus className="h-3 w-3 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1 truncate text-left">
                {createLabel.isPending ? "Creating…" : `Create "${trimmed}"`}
              </span>
            </CommandItem>
          ) : null}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
