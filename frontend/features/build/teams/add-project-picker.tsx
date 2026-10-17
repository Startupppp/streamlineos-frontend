"use client";

import { useCallback, useMemo, useState } from "react";
import { PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useProjects } from "@/hooks/api/build/projects";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { cn } from "@/lib/utils";

interface AddProjectPickerProps {
  teamId: number;
  assignedProjectIds: number[];
  isPending: boolean;
  onAdd: (projectId: number) => void;
}

export function AddProjectPicker({
  assignedProjectIds,
  isPending,
  onAdd,
}: AddProjectPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const { data } = useProjects({ limit: 100 });
  const allProjects = useMemo(() => data?.data ?? [], [data]);

  const options = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allProjects.filter((p) => {
      if (assignedProjectIds.includes(p.id)) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q)
      );
    });
  }, [allProjects, assignedProjectIds, search]);

  const selectedProject = useMemo(
    () => (selectedId !== null ? allProjects.find((p) => p.id === selectedId) : undefined),
    [allProjects, selectedId],
  );

  const handleSelect = useCallback((idStr: string) => {
    setSelectedId(Number(idStr));
    setOpen(false);
    setSearch("");
  }, []);

  const handleAdd = useCallback(() => {
    if (selectedId === null) return;
    onAdd(selectedId);
    setSelectedId(null);
  }, [selectedId, onAdd]);

  const handleSearchChange = useCallback((v: string) => {
    setSearch(v);
  }, []);

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
      <ResponsivePopover open={open} onOpenChange={setOpen}>
        <ResponsivePopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-label="Add project to team"
            size="sm"
            className={cn(
              "h-9 min-w-0 w-full justify-start gap-1.5 text-xs font-normal",
              !selectedProject && "text-muted-foreground",
            )}
          >
            {selectedProject ? (
              <>
                <span className="font-mono text-micro text-muted-foreground">
                  {selectedProject.key}
                </span>
                <span className="truncate">{selectedProject.name}</span>
              </>
            ) : (
              "Pick a project…"
            )}
          </Button>
        </ResponsivePopoverTrigger>
        <ResponsivePopoverContent title="Select project" className="w-72 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by name or key…"
              className="text-xs"
              value={search}
              onValueChange={handleSearchChange}
            />
            <CommandList className="max-h-52 overflow-y-auto scrollbar-hide">
              <CommandEmpty className="py-2 text-center text-xs text-muted-foreground">
                No projects available.
              </CommandEmpty>
              <CommandGroup>
                {options.map((p) => (
                  <CommandItem
                    key={p.id}
                    value={String(p.id)}
                    onSelect={handleSelect}
                    className="gap-2"
                  >
                    <span className="font-mono text-micro text-muted-foreground shrink-0">
                      {p.key}
                    </span>
                    <span className="truncate text-xs">{p.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </ResponsivePopoverContent>
      </ResponsivePopover>
      <LoadingButton
        size="sm"
        className="h-9 gap-1 text-xs"
        disabled={selectedId === null}
        isPending={isPending}
        loadingText="Adding…"
        onClick={handleAdd}
        {...hoverHandlers}
      >
        <PlusIcon ref={iconRef} size={12} /> Add
      </LoadingButton>
    </div>
  );
}
