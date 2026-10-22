import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { NO_CURSOR_YET } from "@/hooks/api/cursor-page-param";

export interface TemplateFilters {
  q?: string;
  category?: string;
  sort?: string;
}

interface TemplateListPage {
  data: unknown[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
}

export function templatesListQueryOptions(filters?: TemplateFilters) {
  const q = filters?.q;
  const category = filters?.category;
  const sort = filters?.sort;
  return {
    queryKey: [...buildWorkQueryKeys.projects.templates(), { q, category, sort }],
    initialPageParam: NO_CURSOR_YET,
    getNextPageParam: (lastPage: TemplateListPage) =>
      lastPage.pagination.nextCursor ?? undefined,
    staleTime: 60_000,
  };
}
