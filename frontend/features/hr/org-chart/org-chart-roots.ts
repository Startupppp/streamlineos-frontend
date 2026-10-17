import type { OrgChartNode } from "./types";

export interface OrgChartRootGroups {
  /** The organisation owner. At most one, and it sits alone at the top. */
  owner: OrgChartNode[];
  /** Roles deliberately placed at the top of the chart (`isTopLevel`). */
  topLevel: OrgChartNode[];
  /** Roots that are merely missing a reporting manager. */
  unassigned: OrgChartNode[];
}

/**
 * V-026. Splitting roots on `hasDirectReports` alone made a fake multi-CEO
 * tree: an unmanaged hire who happened to have someone reporting to them was
 * promoted to a peer root beside the owner. Placement at the top of the chart
 * is a deliberate fact the server knows (`isOwner`, `isTopLevel`), not
 * something to infer from the shape of the edges.
 *
 * `hasDirectReports` survives only as a tiebreak for a payload that predates
 * those two fields, so an older server still renders the chart it used to.
 */
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
      // Pre-`isTopLevel` payload: the old reading, and only here.
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
