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
  OrgTreeNode,
  OrgTreeBranch,
  OrgTreeDepartment,
  OrgTreeTeam,
} from "@/types/org-hierarchy";
import { RequireModule } from "@/components/auth/require-module";
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

interface TreeItemProps {
  name: string;
  code: string;
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
        <Badge variant="outline" className="hidden h-5 px-2 text-[10px] sm:inline-flex">
          {NODE_LABELS[type]}
        </Badge>
        <span className="text-xs text-muted-foreground font-mono">{code}</span>
        {status !== "ACTIVE" && (
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
            {status}
          </Badge>
        )}
        {childCount > 0 && (
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full tabular-nums">
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

function BusinessUnitNode({ node }: { node: OrgTreeNode }) {
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

function filterTree(nodes: OrgTreeNode[], q: string): OrgTreeNode[] {
  if (!q) return nodes;
  const lower = q.toLowerCase();

  function matchesBranch(b: OrgTreeBranch): OrgTreeBranch | null {
    const depts = b.children
      .map((d) => {
        const teams = d.children.filter(
          (t) =>
            t.name.toLowerCase().includes(lower) ||
            t.code.toLowerCase().includes(lower),
        );
        if (
          d.name.toLowerCase().includes(lower) ||
          d.code.toLowerCase().includes(lower)
        ) {
          return { ...d, children: d.children };
        }
        if (teams.length) return { ...d, children: teams };
        return null;
      })
      .filter((d): d is OrgTreeDepartment => d !== null);

    if (
      b.name.toLowerCase().includes(lower) ||
      b.code.toLowerCase().includes(lower)
    ) {
      return { ...b, children: b.children };
    }
    if (depts.length) return { ...b, children: depts };
    return null;
  }

  return nodes
    .map((bu) => {
      const branches = bu.children
        .map(matchesBranch)
        .filter((b): b is OrgTreeBranch => b !== null);
      if (
        bu.name.toLowerCase().includes(lower) ||
        bu.code.toLowerCase().includes(lower)
      ) {
        return { ...bu, children: bu.children };
      }
      if (branches.length) return { ...bu, children: branches };
      return null;
    })
    .filter((n): n is OrgTreeNode => n !== null);
}

export default function OrgTreePage() {
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
    <RequireModule module="hr">
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
                    : "Add a business unit, or finish workspace setup to generate a starter structure."
                }
              />
            )}
            {!isLoading && !isError && filtered.length > 0 && (
              <div className="py-2">
                {filtered.map((bu) => (
                  <BusinessUnitNode key={bu.id} node={bu} />
                ))}
              </div>
            )}
          </div>
        </div>
      </PageWrapper>
    </RequireModule>
  );
}
