export interface OrgChartNode {
  id: string;
  name: string | null;
  role: string | null;
  designation: string | null;
  image: string | null;
  departmentId: string | null;
  departmentName: string | null;
  hasDirectReports: boolean;
  /**
   * V-026. Placement at the top of the chart, as the server knows it.
   * Optional because a server that predates the fields omits it — see
   * `splitOrgChartRoots` for the fallback that keeps such a payload working.
   */
  isOwner?: boolean;
  isTopLevel?: boolean;
}

export interface OrgChartCursorPage {
  data: OrgChartNode[];
  pageInfo: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface OrgChartQuery {
  parentId?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}
