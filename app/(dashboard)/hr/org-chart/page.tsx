"use client";

import { useMemo } from "react";
import { useHrEmployees, useHrDepartments } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, resolveImageUrl } from "@/lib/utils";
import { Users, Network, Building2 } from "lucide-react";
import type { Employee } from "@/types/hr";
import Image from "next/image";

interface TreeNode {
  employee: Employee;
  children: TreeNode[];
}

const ROLE_DOT: Record<string, string> = {
  CEO: "bg-amber-500",
  HR: "bg-purple-500",
  ADMIN: "bg-blue-500",
};

function buildTree(employees: Employee[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const emp of employees) {
    map.set(emp.id, { employee: emp, children: [] });
  }

  for (const emp of employees) {
    const node = map.get(emp.id)!;
    if (emp.reportingTo && map.has(emp.reportingTo) && emp.reportingTo !== emp.id) {
      map.get(emp.reportingTo)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Break any remaining cycles (e.g. A→B→A) by DFS; nodes in cycles become roots
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function detectAndBreakCycles(nodeId: string): boolean {
    if (inStack.has(nodeId)) return true; // cycle detected
    if (visited.has(nodeId)) return false;
    visited.add(nodeId);
    inStack.add(nodeId);
    const node = map.get(nodeId);
    if (node) {
      node.children = node.children.filter((child) => {
        const isCycle = detectAndBreakCycles(child.employee.id);
        if (isCycle) {
          // Detach this child from the cycle; make it a root instead
          roots.push(child);
          return false;
        }
        return true;
      });
    }
    inStack.delete(nodeId);
    return false;
  }

  for (const root of [...roots]) {
    detectAndBreakCycles(root.employee.id);
  }

  const priority: Record<string, number> = { CEO: 0, ADMIN: 1, HR: 2 };
  function sortNodes(nodes: TreeNode[]) {
    nodes.sort((a, b) => {
      const pa = priority[a.employee.role] ?? 99;
      const pb = priority[b.employee.role] ?? 99;
      return pa !== pb ? pa - pb : (a.employee.name ?? "").localeCompare(b.employee.name ?? "");
    });
    nodes.forEach((n) => sortNodes(n.children));
  }
  sortNodes(roots);
  return roots;
}

function PersonCard({ emp, size = "md" }: { emp: Employee; size?: "sm" | "md" }) {
  const isSm = size === "sm";
  return (
    <div className={cn(
      "flex items-center gap-2.5 rounded-lg border bg-card p-2.5 hover:shadow-sm transition-shadow",
      isSm ? "min-w-[160px]" : "min-w-[200px]"
    )}>
      <Avatar className={isSm ? "h-8 w-8" : "h-9 w-9"}>
        <AvatarImage src={resolveImageUrl(emp.image)} />
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          {emp.name?.[0] ?? "?"}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className={cn("font-medium truncate", isSm ? "text-xs" : "text-sm")}>{emp.name ?? "Unknown"}</p>
        <p className="text-[10px] text-muted-foreground truncate">{emp.designation ?? emp.role}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="outline" className="text-[10px] h-5 px-1.5">
          {emp.role}
        </Badge>
        <span className={cn("h-2 w-2 rounded-full", ROLE_DOT[emp.role] ?? "bg-muted-foreground/40")} />
      </div>
    </div>
  );
}

const MAX_TREE_DEPTH = 20;

function TreeBranch({ node, depth = 0, isLast = false }: { node: TreeNode; depth?: number; isLast?: boolean }) {
  const hasChildren = node.children.length > 0 && depth < MAX_TREE_DEPTH;

  return (
    <div className="relative">
      {depth > 0 && (
        <>
          <span
            className={cn(
              "absolute left-0 border-l border-border/60",
              isLast ? "top-0 h-5" : "top-0 h-full"
            )}
          />
          <span className="absolute left-0 top-5 w-4 border-t border-border/60" />
        </>
      )}

      <div className={cn(depth > 0 ? "pl-4" : "")}>
        <div className="flex items-center gap-2">
          <PersonCard emp={node.employee} size={depth > 1 ? "sm" : "md"} />
          {hasChildren && (
            <Badge variant="secondary" className="h-5 text-[10px]">
              {node.children.length} report{node.children.length > 1 ? "s" : ""}
            </Badge>
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

function TreeRootGroup({ label, roots, dotCls }: { label: string; roots: TreeNode[]; dotCls?: string }) {

  const withChildren = roots.filter((r) => r.children.length > 0);
  const standalone = roots.filter((r) => r.children.length === 0);

  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <div className="mb-2 flex items-center gap-2">
        {dotCls && <span className={cn("h-2 w-2 rounded-full", dotCls)} />}
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <Badge variant="secondary" className="h-4 text-[9px] px-1.5">
          {roots.length}
        </Badge>
      </div>

      {standalone.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {standalone.map((node) => (
            <PersonCard key={node.employee.id} emp={node.employee} />
          ))}
        </div>
      )}

      {withChildren.length > 0 && (
        <div className="space-y-2">
          {withChildren.map((node) => (
            <TreeBranch key={node.employee.id} node={node} />
          ))}
        </div>
      )}
    </div>
  );
}

function TreeLegend() {
  const items = [
    { label: "CEO", cls: ROLE_DOT.CEO },
    { label: "Admin", cls: ROLE_DOT.ADMIN },
    { label: "HR", cls: ROLE_DOT.HR },
    { label: "Other", cls: "bg-muted-foreground/40" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <Badge key={item.label} variant="outline" className="text-[10px] h-6 gap-1.5">
          <span className={cn("h-2 w-2 rounded-full", item.cls)} />
          {item.label}
        </Badge>
      ))}
    </div>
  );
}

export default function OrgChartPage() {
  const { data: employeesRaw, isLoading } = useHrEmployees();
  const { data: departments } = useHrDepartments();

  const employees = useMemo(
    () => (Array.isArray(employeesRaw) ? employeesRaw : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[],
    [employeesRaw]
  );

  const tree = useMemo(() => buildTree(employees), [employees]);

  const rootGroups = useMemo(() => {
    const groups = new Map<string, TreeNode[]>();
    for (const root of tree) {
      const role = root.employee.role;
      if (!groups.has(role)) groups.set(role, []);
      groups.get(role)!.push(root);
    }

    const priority: Record<string, number> = { CEO: 0, ADMIN: 1, HR: 2 };
    return Array.from(groups.entries()).sort((a, b) => {
      const pa = priority[a[0]] ?? 99;
      const pb = priority[b[0]] ?? 99;
      return pa !== pb ? pa - pb : a[0].localeCompare(b[0]);
    });
  }, [tree]);

  const deptMap = useMemo(() => {
    const map = new Map<number, string>();
    departments?.forEach((d) => map.set(d.id, d.name));
    return map;
  }, [departments]);

  const deptGroups = useMemo(() => {
    const groups = new Map<string, Employee[]>();
    for (const emp of employees) {
      const name = emp.departmentId ? (deptMap.get(emp.departmentId) ?? "Other") : "Unassigned";
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name)!.push(emp);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [employees, deptMap]);

  if (isLoading) {
    return (
      <PageWrapper title="Organization" subtitle="Team structure and departments">
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Organization"
      subtitle={`${employees.length} members across ${deptGroups.length} departments`}
    >
      <Tabs defaultValue="tree">
        <TabsList className="h-9 mb-4">
          <TabsTrigger value="tree" className="text-xs gap-1.5 px-3">
            <Network className="h-3.5 w-3.5" />
            Hierarchy
          </TabsTrigger>
          <TabsTrigger value="departments" className="text-xs gap-1.5 px-3">
            <Building2 className="h-3.5 w-3.5" />
            Departments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tree">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Clear reporting tree with parent-child links and direct reports.
                </p>
                <TreeLegend />
              </div>
              <ScrollArea className="w-full" type="auto">
                <div className="space-y-3 min-w-[720px]">
                  {rootGroups.map(([role, roots]) => (
                    <TreeRootGroup
                      key={role}
                      label={role}
                      roots={roots}
                      dotCls={ROLE_DOT[role] ?? "bg-muted-foreground/40"}
                    />
                  ))}
                  {tree.length === 0 && (
                    <div className="py-8">
                      <Image
                        src="/illustrations/undraw-online-survey.svg"
                        alt="Empty state illustration"
                        width={200}
                        height={160}
                        className="mx-auto mb-4 opacity-90"
                      />
                      <p className="text-sm text-muted-foreground text-center">No reporting structure found.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {deptGroups.map(([name, members]) => (
              <Card key={name}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">{name}</h3>
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <Users className="h-3 w-3" />
                      {members.length}
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
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
                        <span className="text-[10px] text-muted-foreground">{emp.designation ?? emp.role}</span>
                      </div>
                    ))}
                    {members.length > 6 && (
                      <p className="text-[10px] text-muted-foreground text-center">+{members.length - 6} more</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
