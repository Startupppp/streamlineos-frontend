import type { OrgChartNode } from "./types";

export interface OrgChartRootGroups {
  owner: OrgChartNode[];
  topLevel: OrgChartNode[];
  unassigned: OrgChartNode[];
}

export function splitOrgChartRoots(roots: readonly OrgChartNode[]): OrgChartRootGroups {
  const owner: OrgChartNode[] = [];
  const topLevel: OrgChartNode[] = [];
  const unassigned: OrgChartNode[] = [];

  for (const root of roots) {
    if (root.isOwner === true) {
      owner.push(root);
    } else if (root.isTopLevel === true) {
      topLevel.push(root);
    } else if (root.isTopLevel === undefined && root.isOwner === undefined) {
      (root.hasDirectReports ? topLevel : unassigned).push(root);
    } else {
      unassigned.push(root);
    }
  }

  return { owner, topLevel, unassigned };
}

export function topLevelRootsHeading(): { title: string; description: string } {
  return {
    title: "Top-level roles",
    description:
      "These roles were placed at the top of the chart deliberately, so they report to nobody by design rather than by omission.",
  };
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
