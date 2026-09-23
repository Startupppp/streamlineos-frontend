import type { OrgChartNode } from "./types";

export interface OrgChartRootGroups {
  managers: OrgChartNode[];
  unassigned: OrgChartNode[];
}

export function splitOrgChartRoots(roots: readonly OrgChartNode[]): OrgChartRootGroups {
  const managers: OrgChartNode[] = [];
  const unassigned: OrgChartNode[] = [];
  for (const root of roots) {
    if (root.hasDirectReports) managers.push(root);
    else unassigned.push(root);
  }
  return { managers, unassigned };
}

export function unassignedRootsHeading(hasManagers: boolean): {
  title: string;
  description: string;
} {
  if (hasManagers)
    return {
      title: "Needs a manager",
      description:
        "These people have no reporting manager on record, so they sit outside the chart above. Assign a manager to bring them into the structure and route their approvals.",
    };
  return {
    title: "No reporting lines yet",
    description:
      "Nobody has a reporting manager on record, so everyone is shown flat. Assign managers to build the chart and unblock leave approvals.",
  };
}
