"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { SearchInput } from "@/components/ui/search-input";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import { useProjects } from "@/hooks/api/projects/projects";
import { NewProjectDialog } from "@/features/projects/project-list/new-project-dialog";
import { setLastProjectId } from "@/lib/projects/last-project";

interface ProjectSwitcherProps {
  currentProjectId: string;
  currentProjectName: string | undefined;
  currentProjectKey?: string | undefined;
}

export function ProjectSwitcher({
  currentProjectId,
  currentProjectName,
}: ProjectSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const canCreate = useCan("projects:create");

  const { data: projectsData, isLoading } = useProjects({ limit: 100 });
  const displayName = currentProjectName ?? "Project";

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
      setLastProjectId(projectId);
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

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setSearch("");
  }, []);

  const handleAddProject = useCallback(() => {
    setOpen(false);
    setSearch("");
    setCreateOpen(true);
  }, []);

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-0.5 text-sm font-semibold transition-colors hover:text-foreground/80"
            aria-label="Switch project"
            aria-expanded={open}
            aria-haspopup="listbox"
          >
            <TruncatedText text={displayName} />
            <ChevronsUpDown className="ml-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start" sideOffset={8}>
          <div className="border-b p-2">
            <SearchInput
              value={search}
              onValueChange={handleSearchChange}
              placeholder="Search projects…"
              autoFocus
            />
          </div>
          <ScrollArea className="max-h-64">
            {isLoading ? (
              <div className="space-y-1 p-1">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-7 w-full rounded-md" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
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
                      <TruncatedText
                        text={p.name}
                        className="min-w-0 flex-1 text-xs"
                      />
                      {isCurrent ? (
                        <Check className="h-3 w-3 shrink-0 text-primary" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <Separator />

          <div className="p-1">
            {canCreate ? (
              <button
                type="button"
                onClick={handleAddProject}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                Add project
              </button>
            ) : null}
            {canCreate ? <Separator className="my-1" /> : null}
            <Link
              href="/projects"
              onClick={() => handleOpenChange(false)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Browse all projects
            </Link>
          </div>
        </PopoverContent>
      </Popover>

      {canCreate ? (
        <NewProjectDialog
          trigger={null}
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      ) : null}
    </>
  );
}
