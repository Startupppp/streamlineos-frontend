export interface OrgChartNode {
  id: string;
  name: string | null;
  role: string | null;
  designation: string | null;
  image: string | null;
  departmentId: string | null;
  departmentName: string | null;
  hasDirectReports: boolean;
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
