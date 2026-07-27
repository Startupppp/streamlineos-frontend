"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAccess } from "@/hooks/api/access";
import {
  Contact2,
  Handshake,
  UserCheck,
  Briefcase,
  Ticket,
  Search,
  Loader2,
  ArrowRight,
  Plus,
  LayoutDashboard,
  Kanban,
  ListTodo,
  RefreshCw,
  BarChart2,
  Star,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import {
  flattenNavRoutes,
  getNavGroupsForUser,
} from "./sidebar/sidebar-nav-items";
import { usePermissions } from "@/lib/rbac/hooks";
import { useEnabledModules } from "@/hooks/api/access/org-modules";
import { cn } from "@/lib/utils";
import { useCommandPalette } from "@/features/command-palette";

interface SearchResult {
  id: number;
  type: "lead" | "deal" | "contact" | "client" | "ticket";
  title: string;
  subtitle: string;
  href: string;
  status?: string;
}

const ENTITY_ICONS = {
  lead: Contact2,
  deal: Handshake,
  contact: UserCheck,
  client: Briefcase,
  ticket: Ticket,
} as const;

const ENTITY_LABELS = {
  lead: "Leads",
  deal: "Deals",
  contact: "Contacts",
  client: "Clients",
  ticket: "Tickets",
} as const;

function ItemIcon({
  icon: Icon,
}: {
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
        "bg-muted text-muted-foreground",
        "transition-colors duration-150",
        "group-data-[selected=true]:bg-primary/10 group-data-[selected=true]:text-foreground",
      )}
    >
      <span className="flex items-center justify-center [&_svg]:!h-4 [&_svg]:!w-4">
        <Icon />
      </span>
    </span>
  );
}

const COMMAND_ITEM_CLASS =
  "group flex items-center gap-2.5 rounded-md px-2 py-1.5 text-foreground data-[selected=true]:bg-primary/5 data-[selected=true]:text-foreground";

const COMMAND_ARROW_CLASS =
  "h-3.5 w-3.5 text-muted-foreground shrink-0 group-data-[selected=true]:text-foreground transition-colors";

const COMMAND_SHORTCUT_CLASS =
  "text-muted-foreground group-data-[selected=true]:text-foreground";

const COMMAND_GROUP_CLASS =
  "[&_[cmdk-group-heading]]:text-muted-foreground";

function extractProjectId(pathname: string): number | null {
  const match = /\/build\/(\d+)/.exec(pathname);
  if (!match) return null;
  const parsed = parseInt(match[1] ?? "", 10);
  return Number.isNaN(parsed) ? null : parsed;
}

interface ProjectNavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  segment: string;
  shortcut?: string;
}

const PROJECT_NAV_ITEMS: ProjectNavItem[] = [
  { label: "Board", icon: Kanban, segment: "", shortcut: "G B" },
  { label: "Backlog", icon: ListTodo, segment: "/backlog" },
  { label: "Sprints", icon: RefreshCw, segment: "/sprints" },
  { label: "My Tickets", icon: Star, segment: "/my-tickets", shortcut: "G I" },
  { label: "Analytics", icon: BarChart2, segment: "/analytics" },
];

export function CommandPalette() {
  const [query, setQuery] = useState("");
  const [entityResults, setEntityResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { data: access } = useAccess();
  const role =
    access?.isOrgOwner === true || access?.isPlatformAdmin === true
      ? "OWNER"
      : "MEMBER";
  const { permissions } = usePermissions();
  const enabledModules = useEnabledModules();
  const { paletteOpen, setPaletteOpen, openCreateTicket } = useCommandPalette();

  const projectId = useMemo(() => extractProjectId(pathname), [pathname]);

  const navGroups = useMemo(
    () => getNavGroupsForUser(role, permissions, enabledModules),
    [role, permissions, enabledModules],
  );

  const pages = useMemo(() => {
    const seen = new Set<string>();
    return navGroups.flatMap((group) =>
      flattenNavRoutes(group.routes)
        .filter((r) => {
          if (seen.has(r.href)) return false;
          seen.add(r.href);
          return true;
        })
        .map((r) => ({
          name: r.label,
          href: r.href,
          icon: r.icon,
          group: group.label,
        })),
    );
  }, [navGroups]);

  useEffect(() => {
    const handleDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen(!paletteOpen);
      }
    };
    document.addEventListener("keydown", handleDown);
    return () => document.removeEventListener("keydown", handleDown);
  }, [paletteOpen, setPaletteOpen]);

  const debouncedQuery = useDebouncedValue(query, 280);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setEntityResults([]);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    apiClient
      .get<{ results: SearchResult[] }>("/search", { q: debouncedQuery })
      .then((data) => {
        if (!cancelled) setEntityResults(data.results);
      })
      .catch(() => {
        if (!cancelled) setEntityResults([]);
      })
      .finally(() => {
        if (!cancelled) setIsSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const handleSelect = useCallback(
    (href: string) => {
      setPaletteOpen(false);
      setQuery("");
      setEntityResults([]);
      router.push(href);
    },
    [router, setPaletteOpen],
  );

  const handleOpenChange = useCallback(
    (v: boolean) => {
      setPaletteOpen(v);
      if (!v) {
        setQuery("");
        setEntityResults([]);
      }
    },
    [setPaletteOpen],
  );

  const handleCreateTicket = useCallback(() => {
    setPaletteOpen(false);
    setQuery("");
    openCreateTicket(projectId);
  }, [projectId, setPaletteOpen, openCreateTicket]);

  const filteredPages = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return pages.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.group.toLowerCase().includes(q),
    );
  }, [query, pages]);

  const pageGroups = useMemo(
    () =>
      filteredPages.reduce<Record<string, typeof filteredPages>>(
        (acc, page) => {
          (acc[page.group] ??= []).push(page);
          return acc;
        },
        {},
      ),
    [filteredPages],
  );

  const entityGroups = useMemo(
    () =>
      entityResults.reduce<Record<string, SearchResult[]>>((acc, r) => {
        (acc[r.type] ??= []).push(r);
        return acc;
      }, {}),
    [entityResults],
  );

  const quickNavGroups = useMemo(() => {
    const seen = new Set<string>();
    return navGroups.slice(0, 5).map((group) => ({
      label: group.label,
      routes: flattenNavRoutes(group.routes)
        .filter((r) => {
          if (seen.has(r.href)) return false;
          seen.add(r.href);
          return true;
        })
        .slice(0, 4),
    }));
  }, [navGroups]);

  const hasResults = filteredPages.length > 0 || entityResults.length > 0;
  const showEmpty = !isSearching && query.length >= 2 && !hasResults;

  return (
    <CommandDialog open={paletteOpen} onOpenChange={handleOpenChange}>
      <div className="relative">
        <CommandInput
          placeholder="Search pages, leads, deals, contacts…"
          value={query}
          onValueChange={setQuery}
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground pointer-events-none" />
        )}
      </div>

      <CommandList className="max-h-[420px] px-1 py-1">
        {showEmpty && (
          <CommandEmpty>
            <div className="flex flex-col items-center gap-2 py-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60">
                <Search className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-foreground">
                No results for &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-muted-foreground">
                Try a page name, lead, deal, or contact
              </p>
            </div>
          </CommandEmpty>
        )}

        {Object.entries(entityGroups).map(([type, items]) => {
          const Icon =
            ENTITY_ICONS[type as keyof typeof ENTITY_ICONS] ?? Search;
          const label =
            ENTITY_LABELS[type as keyof typeof ENTITY_LABELS] ?? type;
          return (
            <CommandGroup
              key={`entity-${type}`}
              heading={label}
              className={COMMAND_GROUP_CLASS}
            >
              {items.map((item) => (
                <CommandItem
                  key={`${item.type}-${item.id}`}
                  value={`${item.title} ${item.subtitle} ${item.type}`}
                  onSelect={() => handleSelect(item.href)}
                  className={COMMAND_ITEM_CLASS}
                >
                  <ItemIcon icon={Icon} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-tight text-foreground">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                  {item.status && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] h-4 shrink-0"
                    >
                      {item.status}
                    </Badge>
                  )}
                  <ArrowRight className={COMMAND_ARROW_CLASS} />
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}

        {entityResults.length > 0 && filteredPages.length > 0 && (
          <CommandSeparator className="my-1" />
        )}

        {query &&
          Object.entries(pageGroups).map(([group, items]) => (
            <CommandGroup
              key={group}
              heading={group}
              className={COMMAND_GROUP_CLASS}
            >
              {items.map((page) => (
                <CommandItem
                  key={page.href}
                  value={`${page.name} ${page.group}`}
                  onSelect={() => handleSelect(page.href)}
                  className={COMMAND_ITEM_CLASS}
                >
                  <ItemIcon icon={page.icon} />
                  <span className="flex-1 text-sm truncate text-foreground">
                    {page.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground shrink-0 hidden sm:block transition-colors">
                    {page.href}
                  </span>
                  <ArrowRight className={COMMAND_ARROW_CLASS} />
                </CommandItem>
              ))}
            </CommandGroup>
          ))}

        {!query && (
          <>
            <CommandGroup
              heading={projectId !== null ? "This project" : "Actions"}
              className={COMMAND_GROUP_CLASS}
            >
              <CommandItem
                value="create ticket issue"
                onSelect={handleCreateTicket}
                className={COMMAND_ITEM_CLASS}
              >
                <ItemIcon icon={Plus} />
                <span className="flex-1 text-sm text-foreground">
                  Create ticket
                </span>
                <CommandShortcut className={COMMAND_SHORTCUT_CLASS}>
                  C
                </CommandShortcut>
              </CommandItem>
              {projectId !== null &&
                PROJECT_NAV_ITEMS.map((item) => (
                  <CommandItem
                    key={item.segment}
                    value={`project ${item.label}`}
                    onSelect={() =>
                      handleSelect(`/build/${projectId}${item.segment}`)
                    }
                    className={COMMAND_ITEM_CLASS}
                  >
                    <ItemIcon icon={item.icon} />
                    <span className="flex-1 text-sm text-foreground">
                      {item.label}
                    </span>
                    {item.shortcut && (
                      <CommandShortcut className={COMMAND_SHORTCUT_CLASS}>
                        {item.shortcut}
                      </CommandShortcut>
                    )}
                  </CommandItem>
                ))}
            </CommandGroup>
            <CommandSeparator className="my-1" />

            <CommandGroup heading="Navigation" className={COMMAND_GROUP_CLASS}>
              <CommandItem
                value="all projects overview"
                onSelect={() => handleSelect("/build")}
                className={COMMAND_ITEM_CLASS}
              >
                <ItemIcon icon={LayoutDashboard} />
                <span className="flex-1 text-sm text-foreground">
                  All Projects
                </span>
              </CommandItem>
              <CommandItem
                value="my work tickets assigned"
                onSelect={() => handleSelect("/build/my-work")}
                className={COMMAND_ITEM_CLASS}
              >
                <ItemIcon icon={Star} />
                <span className="flex-1 text-sm text-foreground">
                  My Work
                </span>
              </CommandItem>
            </CommandGroup>
            <CommandSeparator className="my-1" />

            <div className="px-2 pb-1 pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Quick navigation
              </p>
            </div>
            {quickNavGroups.map((group) =>
              group.routes.length > 0 ? (
                <CommandGroup
                  key={group.label}
                  heading={group.label}
                  className={COMMAND_GROUP_CLASS}
                >
                  {group.routes.map((route) => (
                    <CommandItem
                      key={route.href}
                      value={`${route.label} ${group.label}`}
                      onSelect={() => handleSelect(route.href)}
                      className={COMMAND_ITEM_CLASS}
                    >
                      <ItemIcon icon={route.icon} />
                      <span className="flex-1 text-sm text-foreground">
                        {route.label}
                      </span>
                      <ArrowRight className={COMMAND_ARROW_CLASS} />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null,
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
