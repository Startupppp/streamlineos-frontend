"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, FolderKanban, Clock, Receipt,
  Settings, Contact2, Target, BarChart3, Handshake,
  UserPlus, Megaphone, HeadphonesIcon, CalendarDays,
  Briefcase, FileText, DollarSign, UserCheck, Network,
  Search, Loader2, Ticket,
} from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api-client";
import { useDebouncedValue } from "@/hooks/use-debounce";

const PAGES = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, group: "Navigation" },
  { name: "Employees", href: "/hr/employees", icon: Users, group: "HR" },
  { name: "Attendance", href: "/hr/attendance", icon: CalendarDays, group: "HR" },
  { name: "Leave Management", href: "/hr/leave", icon: FileText, group: "HR" },
  { name: "Payroll", href: "/hr/payroll", icon: DollarSign, group: "HR" },
  { name: "Expenses", href: "/hr/expenses", icon: Receipt, group: "HR" },
  { name: "Devices", href: "/hr/devices", icon: Briefcase, group: "HR" },
  { name: "Work Logs", href: "/hr/work-logs", icon: Clock, group: "HR" },
  { name: "Org Chart", href: "/hr/org-chart", icon: Network, group: "HR" },
  { name: "Projects", href: "/projects", icon: FolderKanban, group: "Projects" },
  { name: "Timesheets", href: "/timesheets", icon: Clock, group: "Projects" },
  { name: "CRM Hub", href: "/crm", icon: Target, group: "CRM" },
  { name: "Lead Pipeline", href: "/crm/leads", icon: Contact2, group: "CRM" },
  { name: "Deals Pipeline", href: "/crm/deals", icon: Handshake, group: "CRM" },
  { name: "Contacts", href: "/crm/contacts", icon: Users, group: "CRM" },
  { name: "Organizations", href: "/crm/organizations", icon: UserPlus, group: "CRM" },
  { name: "CRM Analytics", href: "/crm/analytics", icon: BarChart3, group: "CRM" },
  { name: "Scoring Rules", href: "/crm/settings/scoring-rules", icon: Target, group: "CRM Settings" },
  { name: "Assignment Rules", href: "/crm/settings/assignment-rules", icon: UserCheck, group: "CRM Settings" },
  { name: "Email Templates", href: "/crm/settings/email-templates", icon: FileText, group: "CRM Settings" },
  { name: "SLA Policies", href: "/crm/settings/sla", icon: Clock, group: "CRM Settings" },
  { name: "Targets", href: "/crm/targets", icon: Target, group: "CRM" },
  { name: "Clients", href: "/crm/clients", icon: UserCheck, group: "CRM" },
  { name: "Sales Dashboard", href: "/sales", icon: DollarSign, group: "Dashboards" },
  { name: "Marketing Dashboard", href: "/marketing", icon: Megaphone, group: "Dashboards" },
  { name: "Support Dashboard", href: "/support", icon: HeadphonesIcon, group: "Dashboards" },
  { name: "Billing", href: "/billing", icon: Receipt, group: "System" },
  { name: "Settings", href: "/settings", icon: Settings, group: "System" },
];

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

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [entityResults, setEntityResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();

  const debouncedQuery = useDebouncedValue(query, 300);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setEntityResults([]);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    apiClient
      .get<{ results: SearchResult[] }>("/search", { q: debouncedQuery })
      .then((data) => { if (!cancelled) setEntityResults(data.results); })
      .catch(() => { if (!cancelled) setEntityResults([]); })
      .finally(() => { if (!cancelled) setIsSearching(false); });

    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const handleSelect = useCallback((href: string) => {
    setOpen(false);
    setQuery("");
    setEntityResults([]);
    router.push(href);
  }, [router]);

  const filteredPages = query.length > 0
    ? PAGES.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    : PAGES;

  const pageGroups = filteredPages.reduce<Record<string, typeof PAGES>>((acc, page) => {
    (acc[page.group] ??= []).push(page);
    return acc;
  }, {});

  const entityGroups = entityResults.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.type] ??= []).push(r);
    return acc;
  }, {});

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search pages, leads, deals, contacts..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>

        {isSearching && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
            <span className="text-xs text-muted-foreground">Searching...</span>
          </div>
        )}

        {Object.entries(entityGroups).map(([type, items]) => {
          const Icon = ENTITY_ICONS[type as keyof typeof ENTITY_ICONS] ?? Search;
          const label = ENTITY_LABELS[type as keyof typeof ENTITY_LABELS] ?? type;
          return (
            <CommandGroup key={`entity-${type}`} heading={label}>
              {items.map((item) => (
                <CommandItem
                  key={`${item.type}-${item.id}`}
                  value={`${item.title} ${item.subtitle} ${item.type}`}
                  onSelect={() => handleSelect(item.href)}
                >
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{item.title}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[120px] ml-2">{item.subtitle}</span>
                  {item.status && (
                    <Badge variant="outline" className="text-[9px] ml-2 shrink-0">{item.status}</Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}

        {entityResults.length > 0 && Object.keys(pageGroups).length > 0 && (
          <CommandSeparator />
        )}

        {Object.entries(pageGroups).map(([group, pages]) => (
          <CommandGroup key={group} heading={group}>
            {pages.map((page) => (
              <CommandItem
                key={page.href}
                value={`${page.name} ${page.group}`}
                onSelect={() => handleSelect(page.href)}
              >
                <page.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                {page.name}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}

        {!isSearching && query.length >= 2 && entityResults.length === 0 && filteredPages.length === 0 && (
          <CommandEmpty>No results found for &quot;{query}&quot;</CommandEmpty>
        )}
      </CommandList>
    </CommandDialog>
  );
}
