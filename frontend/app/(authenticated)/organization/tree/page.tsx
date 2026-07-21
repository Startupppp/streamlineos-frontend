"use client";

import { useState, useCallback, type ChangeEvent } from "react";
import { Building2, GitBranch, Briefcase, Users } from "lucide-react";
import { ChevronRightIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useOrgTree } from "@/hooks/api/org-hierarchy";
import type {
  OrgTreeNode,
  OrgTreeBranch,
  OrgTreeDepartment,
  OrgTreeTeam,
} from "@/types/org-hierarchy";
import { RequireModule } from "@/components/auth/require-module";

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

const NODE_COLORS: Record<NodeType, string> = {
  business_unit: "text-blue-600 dark:text-blue-400",
  branch: "text-emerald-600 dark:text-emerald-400",
  department: "text-amber-600 dark:text-amber-400",
  team: "text-rose-600 dark:text-rose-400",
};

const NODE_DOT_COLORS: Record<NodeType, string> = {
  business_unit: "bg-blue-500",
  branch: "bg-emerald-500",
  department: "bg-amber-500",
  team: "bg-rose-500",
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
  const [expanded, setExpanded] = useState(depth < 2);
  const Icon = NODE_ICONS[type];
  const colorClass = NODE_COLORS[type];
  const hasChildren = childCount > 0;
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const handleToggle = useCallback(() => {
    if (hasChildren) setExpanded((p) => !p);
  }, [hasChildren]);

  return (
    <div>
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer group transition-colors"
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
        onClick={handleToggle}
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
        <Icon className={`h-4 w-4 shrink-0 ${colorClass}`} />
        <span className="font-medium text-sm truncate flex-1">{name}</span>
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
      </div>
      {expanded && children}
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
  const { data, isLoading, isError } = useOrgTree();
  const [search, setSearch] = useState("");

  const filtered = filterTree(data ?? [], search);

  const handleSearchChange = useCallback(
    (value: string) => setSearch(value),
    [],
  );

  const legend: { type: NodeType; label: string }[] = [
    { type: "business_unit", label: NODE_LABELS.business_unit },
    { type: "branch", label: NODE_LABELS.branch },
    { type: "department", label: NODE_LABELS.department },
    { type: "team", label: NODE_LABELS.team },
  ];

  return (
    <RequireModule module="HR">
      <PageWrapper
        mobileFiltersInline
        title="Organization Tree"
        subtitle="Full hierarchy from business units down to teams"
        filters={
          <div className="min-w-0 w-full flex-1 md:min-w-[160px] md:max-w-xs">
            <SearchInput
              placeholder="Search nodes…"
              value={search}
              onValueChange={handleSearchChange}
            />
          </div>
        }
      >
        <div className="space-y-3">
          <div className="flex gap-4 flex-wrap">
            {legend.map(({ type, label }) => {
              const Icon = NODE_ICONS[type];
              return (
                <div
                  key={type}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${NODE_DOT_COLORS[type]}`}
                  />
                  <Icon className={`h-3 w-3 ${NODE_COLORS[type]}`} />
                  <span>{label}</span>
                </div>
              );
            })}
          </div>

          <div className="border border-border rounded-xl bg-card shadow-sm overflow-x-auto">
            {isLoading && (
              <div className="p-4 space-y-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-8 rounded-md"
                    style={{ marginLeft: `${(i % 3) * 20}px` }}
                  />
                ))}
              </div>
            )}
            {isError && (
              <div className="min-h-[260px] flex flex-col items-center justify-center gap-3 text-center px-6">
                <p className="text-sm font-medium text-foreground">
                  Failed to load organization tree
                </p>
                <p className="text-xs text-muted-foreground">
                  Check your connection and try again.
                </p>
              </div>
            )}
            {!isLoading && !isError && filtered.length === 0 && (
              <div className="min-h-[260px] flex flex-col items-center justify-center gap-3 text-center px-6">
                <Building2 className="w-8 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground">
                  {search
                    ? "No results match your search."
                    : "No business units found"}
                </p>
                {!search && (
                  <p className="text-xs text-muted-foreground">
                    Create a business unit to build your organization tree.
                  </p>
                )}
              </div>
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
