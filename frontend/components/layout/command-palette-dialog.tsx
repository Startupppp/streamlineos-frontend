"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { extractBuildProjectId } from "@/lib/build/extract-build-project-id";
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
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import {
  flattenNavRoutes,
  getNavGroupsForUser,
} from "./sidebar/sidebar-nav-items";
import { useEnabledModules } from "@/hooks/api/access/org-modules";
import { useEntitlements } from "@/hooks/api/entitlements";
import { cn } from "@/lib/utils";
import { useCommandPalette } from "@/components/command-palette";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";
import {
  useGlobalSearch,
  type GlobalSearchResult,
} from "@/components/command-palette/hooks/use-global-search";
import { useCommandRegistry } from "./command-palette-commands";


const ENTITY_TYPES = [
  "lead",
  "deal",
  "contact",
  "client",
  "ticket",
] as const satisfies readonly GlobalSearchResult["type"][];

type EntityType = (typeof ENTITY_TYPES)[number];

const ENTITY_ICONS: Record<
  EntityType,
  React.ComponentType<{ className?: string }>
> = {
  lead: Contact2,
  deal: Handshake,
  contact: UserCheck,
  client: Briefcase,
  ticket: Ticket,
};

const ENTITY_LABELS: Record<EntityType, string> = {
  lead: "Leads",
  deal: "Deals",
  contact: "Contacts",
  client: "Clients",
  ticket: "Tickets",
};


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


export function CommandPaletteDialogBody() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: access } = useAccess();
  const requestLeave = useNavigationLeave();
  const [query, setQuery] = useState("");

  const role =
    access?.isOrgOwner
      ? "OWNER"
      : "MEMBER";
  const scopes = access?.scopes;
  const enabledModules = useEnabledModules();
  const { data: entitlements } = useEntitlements();
  const lockedModules = useMemo(
    () => entitlements?.lockedModules ?? [],
    [entitlements],
  );
  const { paletteOpen, setPaletteOpen, openCreateTicket } = useCommandPalette();

  const projectId = useMemo(() => extractBuildProjectId(pathname), [pathname]);

  const navGroups = useMemo(
    () => getNavGroupsForUser(role, scopes, enabledModules, lockedModules),
    [role, scopes, enabledModules, lockedModules],
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

  const debouncedQuery = useDebouncedValue(query, 300);
  const { results: entityResults, isSearching } =
    useGlobalSearch(debouncedQuery);

  const handleSelect = useCallback(
    (href: string) => {
      setPaletteOpen(false);
      setQuery("");
      requestLeave(() => router.push(href));
    },
    [router, setPaletteOpen, requestLeave],
  );

  const handleOpenChange = useCallback(
    (v: boolean) => {
      setPaletteOpen(v);
      if (!v) setQuery("");
    },
    [setPaletteOpen],
  );

  const handleCreateTicket = useCallback(() => {
    setPaletteOpen(false);
    setQuery("");
    openCreateTicket(projectId);
  }, [projectId, setPaletteOpen, openCreateTicket]);

  const commands = useCommandRegistry({
    projectId,
    handleSelect,
    handleCreateTicket,
  });

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
      entityResults.reduce<
        Partial<Record<EntityType, GlobalSearchResult[]>>
      >((acc, r) => {
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

  const actionsCommands = commands.filter(
    (c) => c.group === "actions" && c.isAvailable,
  );
  const navCommands = commands.filter(
    (c) => c.group === "navigation" && c.isAvailable,
  );

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
                <Search className="h-5 w-5 text-muted-foreground" />
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

        {ENTITY_TYPES.map((type) => {
          const items = entityGroups[type];
          if (!items?.length) return null;
          const Icon = ENTITY_ICONS[type];
          const label = ENTITY_LABELS[type];
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
                    <p className="text-dense text-muted-foreground truncate leading-tight mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                  {item.status && (
                    <Badge
                      variant="secondary"
                      className="text-micro h-4 shrink-0"
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
                  <span className="text-dense text-muted-foreground shrink-0 hidden sm:block transition-colors">
                    {page.href}
                  </span>
                  <ArrowRight className={COMMAND_ARROW_CLASS} />
                </CommandItem>
              ))}
            </CommandGroup>
          ))}

        {!query && (
          <>
            {actionsCommands.length > 0 && (
              <>
                <CommandGroup
                  heading={projectId !== null ? "This project" : "Actions"}
                  className={COMMAND_GROUP_CLASS}
                >
                  {actionsCommands.map((cmd) => (
                    <CommandItem
                      key={cmd.id}
                      value={cmd.keywords.join(" ")}
                      onSelect={cmd.execute}
                      className={COMMAND_ITEM_CLASS}
                    >
                      <ItemIcon icon={cmd.icon} />
                      <span className="flex-1 text-sm text-foreground">
                        {cmd.label}
                      </span>
                      {cmd.shortcut && (
                        <CommandShortcut className={COMMAND_SHORTCUT_CLASS}>
                          {cmd.shortcut}
                        </CommandShortcut>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator className="my-1" />
              </>
            )}

            {navCommands.length > 0 && (
              <>
                <CommandGroup heading="Navigation" className={COMMAND_GROUP_CLASS}>
                  {navCommands.map((cmd) => (
                    <CommandItem
                      key={cmd.id}
                      value={cmd.keywords.join(" ")}
                      onSelect={cmd.execute}
                      className={COMMAND_ITEM_CLASS}
                    >
                      <ItemIcon icon={cmd.icon} />
                      <span className="flex-1 text-sm text-foreground">
                        {cmd.label}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator className="my-1" />
              </>
            )}

            <div className="px-2 pb-1 pt-2">
              <p className="text-micro font-semibold uppercase tracking-widest text-muted-foreground">
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
