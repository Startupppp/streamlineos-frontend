"use client";

import { useMemo, useState, useCallback } from "react";
import { useHrOrgChart } from "@/hooks/api/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, resolveImageUrl } from "@/lib/utils";
import { Users, Network, Building2, Download } from "lucide-react";
import type { OrgChartNode } from "@/types/hr";
import { TruncatedText } from "@/components/ui/truncated-text";
import { toast } from "sonner";

interface TreeNode {
  employee: OrgChartNode;
  children: TreeNode[];
}

const ROLE_DOT: Record<string, string> = {
  Ceo: "bg-amber-500",
  Hr: "bg-blue-500",
  Admin: "bg-blue-500",
};

const ROLE_ACCENT: Record<string, string> = {
  Ceo: "border-l-amber-500",
  Hr: "border-l-blue-500",
  Admin: "border-l-blue-500",
};

function buildTree(nodes: OrgChartNode[]): TreeNode[] {
  const seen = new Set<string>();
  const unique: OrgChartNode[] = [];
  for (const n of nodes) {
    if (!seen.has(n.id)) { seen.add(n.id); unique.push(n); }
  }

  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const emp of unique) map.set(emp.id, { employee: emp, children: [] });

  for (const emp of unique) {
    const node = map.get(emp.id)!;
    if (emp.reportingTo && map.has(emp.reportingTo) && emp.reportingTo !== emp.id) {
      map.get(emp.reportingTo)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();

  function detectAndBreakCycles(nodeId: string): boolean {
    if (inStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    visited.add(nodeId);
    inStack.add(nodeId);
    const node = map.get(nodeId);
    if (node) {
      node.children = node.children.filter((child) => {
        const isCycle = detectAndBreakCycles(child.employee.id);
        if (isCycle) { roots.push(child); return false; }
        return true;
      });
    }
    inStack.delete(nodeId);
    return false;
  }

  for (const root of [...roots]) detectAndBreakCycles(root.employee.id);

  const priority: Record<string, number> = { Ceo: 0, Admin: 1, Hr: 2 };

  function sortNodes(treeNodes: TreeNode[]) {
    treeNodes.sort((a, b) => {
      const pa = priority[a.employee.role] ?? 99;
      const pb = priority[b.employee.role] ?? 99;
      return pa !== pb ? pa - pb : (a.employee.name ?? "").localeCompare(b.employee.name ?? "");
    });
    treeNodes.forEach((n) => sortNodes(n.children));
  }

  sortNodes(roots);
  return roots;
}

const MAX_TREE_DEPTH = 20;

function PersonCard({ emp, size = "md" }: { emp: OrgChartNode; size?: "sm" | "md" }) {
  const isSm = size === "sm";
  const accent = ROLE_ACCENT[emp.role] ?? "border-l-border";
  return (
    <div className={cn(
      "flex items-center gap-2.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden",
      "border-l-4 transition-shadow duration-200 hover:shadow-md",
      isSm ? "min-w-[152px] p-2" : "min-w-[192px] p-2.5",
      accent,
    )}>
      <Avatar className={isSm ? "h-7 w-7" : "h-8 w-8"}>
        <AvatarImage src={resolveImageUrl(emp.image)} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {emp.name?.[0] ?? "?"}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className={cn("font-semibold truncate", isSm ? "text-xs" : "text-sm")}>{emp.name ?? "Unknown"}</p>
        <p className="text-[10px] text-muted-foreground truncate">{emp.designation ?? emp.role}</p>
      </div>
      <span className={cn("h-2 w-2 rounded-full shrink-0", ROLE_DOT[emp.role] ?? "bg-muted-foreground/40")} />
    </div>
  );
}

function TreeBranch({ node, depth = 0, isLast = false }: { node: TreeNode; depth?: number; isLast?: boolean }) {
  const hasChildren = node.children.length > 0 && depth < MAX_TREE_DEPTH;

  return (
    <div className="relative">
      {depth > 0 && (
        <>
          <span className={cn(
            "absolute left-0 border-l border-border/60",
            isLast ? "top-0 h-5" : "top-0 h-full",
          )} />
          <span className="absolute left-0 top-5 w-4 border-t border-border/60" />
        </>
      )}
      <div className={cn(depth > 0 ? "pl-4" : "")}>
        <div className="flex items-center gap-2">
          <PersonCard emp={node.employee} size={depth > 1 ? "sm" : "md"} />
          {hasChildren && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-muted border-border text-muted-foreground">
              {node.children.length} report{node.children.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        {hasChildren && (
          <div className="mt-2 ml-4 space-y-2">
            {node.children.map((child, idx) => (
              <TreeBranch
                key={child.employee.id}
                node={child}
                depth={depth + 1}
                isLast={idx === node.children.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const LEGEND_ITEMS = [
  { label: "CEO", cls: ROLE_DOT.Ceo },
  { label: "Admin", cls: ROLE_DOT.Admin },
  { label: "HR", cls: ROLE_DOT.Hr },
  { label: "Other", cls: "bg-muted-foreground/40" },
];

type OrgView = "tree" | "departments";

export default function OrgChartPage() {
  const { data: rawNodes, isLoading } = useHrOrgChart();
  const [view, setView] = useState<OrgView>("tree");
  const [search, setSearch] = useState("");

  const employees = useMemo<OrgChartNode[]>(() => {
    if (!Array.isArray(rawNodes)) return [];
    const seen = new Set<string>();
    return rawNodes.filter((n) => { if (seen.has(n.id)) return false; seen.add(n.id); return true; });
  }, [rawNodes]);

  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter((e) =>
      (e.name ?? "").toLowerCase().includes(q) ||
      (e.designation ?? "").toLowerCase().includes(q) ||
      (e.departmentName ?? "").toLowerCase().includes(q),
    );
  }, [employees, search]);

  const tree = useMemo(() => buildTree(filteredEmployees), [filteredEmployees]);

  const rootGroups = useMemo(() => {
    const groups = new Map<string, TreeNode[]>();
    for (const root of tree) {
      const role = root.employee.role;
      if (!groups.has(role)) groups.set(role, []);
      groups.get(role)!.push(root);
    }
    const priority: Record<string, number> = { Ceo: 0, Admin: 1, Hr: 2 };
    return Array.from(groups.entries()).sort((a, b) => {
      const pa = priority[a[0]] ?? 99;
      const pb = priority[b[0]] ?? 99;
      return pa !== pb ? pa - pb : a[0].localeCompare(b[0]);
    });
  }, [tree]);

  const deptGroups = useMemo(() => {
    const groups = new Map<string, OrgChartNode[]>();
    for (const emp of filteredEmployees) {
      const name = emp.departmentName ?? (emp.departmentId ? "Other" : "Unassigned");
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name)!.push(emp);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredEmployees]);

  const handleSearchChange = useCallback((value: string) => setSearch(value), []);

  const handleViewTree = useCallback(() => setView("tree"), []);
  const handleViewDepartments = useCallback(() => setView("departments"), []);

  const handleExport = useCallback(async () => {
    try {
      const { downloadXlsx } = await import("@/lib/export/xlsx-utils");
      await downloadXlsx("org-chart.xlsx", [{
        name: "Organization",
        columns: [
          { header: "Name", key: "name", width: 24 },
          { header: "Role", key: "role", width: 12 },
          { header: "Designation", key: "designation", width: 20 },
          { header: "Department", key: "department", width: 20 },
        ],
        rows: employees.map((e) => ({
          name: e.name ?? "",
          role: e.role,
          designation: e.designation ?? "",
          department: e.departmentName ?? "",
        })),
      }]);
      toast.success("Org chart exported");
    } catch {
      toast.error("Export failed");
    }
  }, [employees]);

  if (isLoading) {
    return (
      <PageWrapper title="Organization" subtitle="Team structure and departments">
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Organization"
      subtitle="Visualize your organization's reporting structure"
      actions={
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport} disabled={!employees.length}>
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      }
      filters={
        <div className="flex items-center gap-2">
          <div className="min-w-0 w-48">
          <SearchInput placeholder="Search members…" value={search} onValueChange={handleSearchChange} />
        </div>
          <div className="flex items-center gap-1 rounded-lg border p-1">
            <button
              onClick={handleViewTree}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors duration-200",
                view === "tree" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Network className="h-3 w-3" />
              Hierarchy
            </button>
            <button
              onClick={handleViewDepartments}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors duration-200",
                view === "departments" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Building2 className="h-3 w-3" />
              Departments
            </button>
          </div>
        </div>
      }
    >
      {view === "tree" && (
        <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-muted-foreground">Reporting hierarchy with direct reports.</p>
              <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
                {LEGEND_ITEMS.map((item) => (
                  <span key={item.label} className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-muted/40 text-muted-foreground">
                    <span className={cn("h-2 w-2 rounded-full", item.cls)} />
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
            <ScrollArea className="w-full" type="auto">
              <div className="space-y-3 min-w-[720px]">
                {rootGroups.length > 0 ? rootGroups.map(([role, roots]) => (
                  <div key={role} className="rounded-xl border bg-muted/20 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", ROLE_DOT[role] ?? "bg-muted-foreground/40")} />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{role}</span>
                      <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {roots.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {roots.map((node) => <TreeBranch key={node.employee.id} node={node} />)}
                    </div>
                  </div>
                )) : (
                  <EmptyState
                    illustrationPreset="companies"
                    title="No results"
                    description={search ? "Try a different search term." : "No reporting structure found."}
                    compact
                  />
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {view === "departments" && (
        deptGroups.length === 0 ? (
          <EmptyState
            illustrationPreset="companies"
            title="No departments found"
            description={search ? "Try a different search term." : undefined}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 items-start">
            {deptGroups.map(([name, members]) => (
              <Card key={name} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">{name}</h3>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-primary/10 border-primary/20 text-foreground">
                      <Users className="h-3 w-3" />
                      {members.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {members.slice(0, 6).map((emp) => (
                      <div key={emp.id} className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={resolveImageUrl(emp.image)} />
                          <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                            {emp.name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{emp.name}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{emp.designation ?? emp.role}</span>
                      </div>
                    ))}
                    {members.length > 6 && (
                      <p className="text-[10px] text-muted-foreground text-center pt-1">
                        +{members.length - 6} more
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}
    </PageWrapper>
  );
}
