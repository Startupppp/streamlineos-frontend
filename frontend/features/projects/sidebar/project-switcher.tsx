"use client";

import { useState, useMemo, useCallback, type ChangeEvent } from "react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronsUpDown, Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProjects } from "@/hooks/api/projects/projects";

export function ProjectSwitcher({
  currentProjectId,
  currentProjectName,
}: {
  currentProjectId: string;
  currentProjectName: string | undefined;
  currentProjectKey?: string | undefined;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: projectsData } = useProjects({ limit: 100 });

  const filtered = useMemo(() => {
    const projects = projectsData?.data ?? [];
    if (!search.trim()) return projects;
    const q = search.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q),
    );
  }, [projectsData?.data, search]);

  const handleSelect = useCallback(
    (projectId: number) => {
      setOpen(false);
      setSearch("");
      const currentBase = `/projects/${currentProjectId}`;
      const subPath = pathname?.startsWith(currentBase)
        ? pathname.slice(currentBase.length)
        : "";
      const target = subPath
        ? `/projects/${projectId}${subPath}`
        : `/projects/${projectId}`;
      router.push(target);
    },
    [currentProjectId, pathname, router],
  );

  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-0.5 text-sm font-semibold transition-colors hover:text-foreground/80"
          aria-label="Switch project"
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span className="truncate">{currentProjectName ?? "Project"}</span>
          <ChevronsUpDown className="ml-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start" sideOffset={8}>
        <div className="border-b p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={handleSearchChange}
              placeholder="Search projects…"
              className="pl-7 text-xs"
              autoFocus
            />
          </div>
        </div>
        <ScrollArea className="max-h-64">
          {filtered.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No projects found.
            </p>
          ) : (
            <div className="p-1" role="listbox" aria-label="Projects">
              {filtered.map((p) => {
                const isCurrent = String(p.id) === currentProjectId;
                const handleClick = () => handleSelect(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="option"
                    aria-selected={isCurrent}
                    onClick={handleClick}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors",
                      isCurrent
                        ? "bg-muted text-foreground"
                        : "text-foreground/80 hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10 text-[9px] font-bold text-primary">
                      {p.key.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-xs">{p.name}</span>
                    {isCurrent ? <Check className="h-3 w-3 shrink-0 text-primary" /> : null}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
