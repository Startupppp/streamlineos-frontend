"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Building2, GitBranch, Briefcase, Users } from "lucide-react";
import { ChevronRightIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { useOrgTree } from "@/hooks/api/org-hierarchy";
import type {
  OrgTreeBusinessUnit,
  OrgTreeBranch,
  OrgTreeDepartment,
  OrgTreeTeam,
  OrgTreeRoot,
} from "@/types/org-hierarchy";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDebouncedValue } from "@/hooks/common/use-debounce";

type NodeType = "business_unit" | "branch" | "department" | "team";

const NODE_ICONS: Record<
  NodeType,
  React.ComponentType<{ className?: string }>
> = {
  business_unit: Building2,
  branch: GitBranch,
  department: Briefcase,
  team: Users,
};

const NODE_LABELS: Record<NodeType, string> = {
  business_unit: "Business Unit",
  branch: "Branch",
  department: "Department",
  team: "Team",
};

function assertNever(value: never): never {
  throw new Error(`Unhandled node type: ${String(value)}`);
}

interface TreeItemProps {
  name: string;
  code: string | null;
  type: NodeType;
  status: string;
  childCount: number;
  depth: number;
  children?: React.ReactNode;
}

function TreeItem({
  name,
  code,
  type,
  status,
  childCount,
  depth,
  children,
}: TreeItemProps) {
  const [expanded, setExpanded] = useState(depth < 1);
  const Icon = NODE_ICONS[type];
  const hasChildren = childCount > 0;
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const handleToggle = useCallback(() => {
    if (hasChildren) setExpanded((p) => !p);
  }, [hasChildren]);

  return (
    <div>
      <button
        type="button"
        className="group flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
        onClick={handleToggle}
        aria-expanded={hasChildren ? expanded : undefined}
        {...hoverHandlers}
      >
        {hasChildren ? (
          <ChevronRightIcon
            ref={iconRef}
            size={16}
            className={`text-muted-foreground shrink-0 transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
          />
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="font-medium text-sm truncate flex-1">{name}</span>
        <Badge variant="outline" className="hidden h-5 px-2 text-micro sm:inline-flex">
          {NODE_LABELS[type]}
        </Badge>
        <span className="text-xs text-muted-foreground font-mono">{code}</span>
        {status !== "ACTIVE" && (
          <Badge variant="secondary" className="text-micro h-4 px-1.5">
            {status}
          </Badge>
        )}
        {childCount > 0 && (
          <span className="text-micro text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full tabular-nums">
            {childCount}
          </span>
        )}
      </button>
      {expanded && children ? (
        <div className="ml-5 border-l border-border/60">{children}</div>
      ) : null}
    </div>
  );
}

function TeamNode({ node, depth }: { node: OrgTreeTeam; depth: number }) {
  return (
    <TreeItem
      name={node.name}
      code={node.code}
      type="team"
      status={node.status}
      childCount={0}
      depth={depth}
    />
  );
}

function DeptNode({ node, depth }: { node: OrgTreeDepartment; depth: number }) {
  return (
    <TreeItem
      name={node.name}
      code={node.code}
      type="department"
      status={node.status}
      childCount={node.children.length}
      depth={depth}
    >
      {node.children.map((team) => (
        <TeamNode key={team.id} node={team} depth={depth + 1} />
      ))}
    </TreeItem>
  );
}

function BranchNode({ node, depth }: { node: OrgTreeBranch; depth: number }) {
  return (
    <TreeItem
      name={node.name}
      code={node.code}
      type="branch"
      status={node.status}
      childCount={node.children.length}
      depth={depth}
    >
      {node.children.map((dept) => (
        <DeptNode key={dept.id} node={dept} depth={depth + 1} />
      ))}
    </TreeItem>
  );
}

function BusinessUnitNode({ node }: { node: OrgTreeBusinessUnit }) {
  return (
    <TreeItem
      name={node.name}
      code={node.code}
      type="business_unit"
      status={node.status}
      childCount={node.children.length}
      depth={0}
    >
      {node.children.map((branch) => (
        <BranchNode key={branch.id} node={branch} depth={1} />
      ))}
    </TreeItem>
  );
}

function RootNode({ node }: { node: OrgTreeRoot }) {
  switch (node.type) {
    case "business_unit":
      return <BusinessUnitNode node={node} />;
    case "branch":
      return <BranchNode node={node} depth={0} />;
    case "department":
      return <DeptNode node={node} depth={0} />;
    case "team":
      return <TeamNode node={node} depth={0} />;
    default:
      return assertNever(node);
  }
}

function matchTeam(t: OrgTreeTeam, lower: string): OrgTreeTeam | null {
  return t.name.toLowerCase().includes(lower) || (t.code ?? "").toLowerCase().includes(lower)
    ? t
    : null;
}

function matchDept(d: OrgTreeDepartment, lower: string): OrgTreeDepartment | null {
  if (d.name.toLowerCase().includes(lower) || (d.code ?? "").toLowerCase().includes(lower)) {
    return { ...d, children: d.children };
  }
  const teams = d.children
    .map((t) => matchTeam(t, lower))
    .filter((t): t is OrgTreeTeam => t !== null);
  if (teams.length) return { ...d, children: teams };
  return null;
}

function matchBranch(b: OrgTreeBranch, lower: string): OrgTreeBranch | null {
  if (b.name.toLowerCase().includes(lower) || (b.code ?? "").toLowerCase().includes(lower)) {
    return { ...b, children: b.children };
  }
  const depts = b.children
    .map((d) => matchDept(d, lower))
    .filter((d): d is OrgTreeDepartment => d !== null);
  if (depts.length) return { ...b, children: depts };
  return null;
}

function matchBusinessUnit(
  bu: OrgTreeBusinessUnit,
  lower: string,
): OrgTreeBusinessUnit | null {
  if (bu.name.toLowerCase().includes(lower) || (bu.code ?? "").toLowerCase().includes(lower)) {
    return { ...bu, children: bu.children };
  }
  const branches = bu.children
    .map((b) => matchBranch(b, lower))
    .filter((b): b is OrgTreeBranch => b !== null);
  if (branches.length) return { ...bu, children: branches };
  return null;
}

function filterRoot(node: OrgTreeRoot, lower: string): OrgTreeRoot | null {
  switch (node.type) {
    case "business_unit":
      return matchBusinessUnit(node, lower);
    case "branch":
      return matchBranch(node, lower);
    case "department":
      return matchDept(node, lower);
    case "team":
      return matchTeam(node, lower);
    default:
      return assertNever(node);
  }
}

function filterTree(nodes: OrgTreeRoot[], q: string): OrgTreeRoot[] {
  if (!q) return nodes;
  const lower = q.toLowerCase();
  return nodes
    .map((node) => filterRoot(node, lower))
    .filter((n): n is OrgTreeRoot => n !== null);
}

export function OrganizationChartPage() {
  const { data, isLoading, isError, error, refetch } = useOrgTree();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const query = searchParams.get("search") ?? "";
  const [search, setSearch] = useState(query);
  const debouncedSearch = useDebouncedValue(search, 300);

  const filtered = filterTree(data ?? [], query);

  useEffect(() => {
    if (debouncedSearch === query) return;
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) params.set("search", debouncedSearch);
    else params.delete("search");
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }, [debouncedSearch, pathname, query, router, searchParams]);

  const handleSearchChange = useCallback(
    (value: string) => setSearch(value),
    [],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <PageWrapper
      title="Organization Chart"
        subtitle="See how business units, branches, departments, and teams connect."
        filters={
          <SearchInput
            placeholder="Search nodes…"
            value={search}
            onValueChange={handleSearchChange}
          />
        }
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-auto rounded-lg border border-border bg-card shadow-sm">
            {isLoading && (
              <div className="p-4 space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-8 rounded-md"
                    style={{ marginLeft: `${(i % 3) * 20}px` }}
                  />
                ))}
              </div>
            )}
            {isError && (
              <ErrorState
                className="flex-1"
                title="Couldn't load the organization chart"
                description={getErrorMessage(error)}
                onRetry={handleRetry}
              />
            )}
            {!isLoading && !isError && filtered.length === 0 && (
              <EmptyState
                className="flex-1 border-0 bg-transparent"
                illustrationPreset="team"
                title={query ? "No matching structure" : "No organization structure yet"}
                description={
                  query
                    ? "No results match your search."
                    : "Add a business unit or branch, or finish workspace setup to generate a starter structure."
                }
              />
            )}
            {!isLoading && !isError && filtered.length > 0 && (
              <div className="py-2">
                {filtered.map((root) => (
                  <RootNode key={root.id} node={root} />
                ))}
              </div>
            )}
          </div>
        </div>
      </PageWrapper>
  );
}
