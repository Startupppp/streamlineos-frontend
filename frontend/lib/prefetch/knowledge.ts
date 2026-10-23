import "server-only";

import type { z } from "zod";
import { dehydrate } from "@tanstack/react-query";
import { createServerQueryClient } from "./server-query-client";
import { resolvePrefetchGate } from "./prefetch-gate";
import { serverGet } from "@/lib/server-fetch";
import {
  kbPagesRecentQueryOptions,
  kbPagesFavoritesQueryOptions,
  kbSpacesListQueryOptions,
  kbAnalyticsOverviewQueryOptions,
  kbHrLinkConfigQueryOptions,
  kbLinkedDocumentsQueryOptions,
  kbLinkedDocumentQueryOptions,
  kbPageCollectionQueryOptions,
  kbPagesTrashQueryOptions,
  kbContentHealthCountsQueryOptions,
  kbPageReviewsQueryOptions,
  kbPageTemplatesQueryOptions,
  kbResearchBriefsQueryOptions,
  kbResearchBriefQueryOptions,
  kbConversationsQueryOptions,
  kbPageQueryOptions,
  kbPageVersionsQueryOptions,
  kbSpaceQueryOptions,
  kbSharingSettingsQueryOptions,
} from "@/hooks/api/kb/kb-read-options";
import {
  kbPageListContract,
  kbFavoritePageListContract,
  kbTrashPageListContract,
  kbPageWithAncestorsContract,
  kbPageVersionListContract,
} from "@/hooks/api/kb/kb-pages-schema";
import {
  kbSpaceListPageContract,
  kbSpaceFullContract,
} from "@/hooks/api/kb/kb-spaces-settings-schema";
import { kbAnalyticsOverviewContract } from "@/hooks/api/kb/kb-analytics-schema";
import {
  linkedDocumentListContract,
  linkedDocumentDetailContract,
} from "@/hooks/api/kb/linked-documents-schema";
import { hrKbLinkFlagsContract } from "@/hooks/api/kb/hr-link-config-schema";
import { kbPageCollectionResponseSchema } from "@/hooks/api/kb/kb-page-collection-schema";
import { contentHealthCountsContract } from "@/hooks/api/kb/content-health-schema";
import { kbPageReviewListContract } from "@/hooks/api/kb/kb-reviews-schema";
import { kbPageTemplateListPageContract } from "@/hooks/api/kb/kb-templates-schema";
import {
  kbResearchBriefListContract,
  kbResearchBriefDetailContract,
} from "@/hooks/api/kb/kb-research-schema";
import { kbConversationListPageContract } from "@/hooks/api/kb/kb-chat-schema";
import { sharingSettingsContract } from "@/hooks/api/kb/kb-sharing-schema";

type KbPageList = z.infer<typeof kbPageListContract>;
type KbFavoritePageList = z.infer<typeof kbFavoritePageListContract>;
type KbSpaceListPage = z.infer<typeof kbSpaceListPageContract>;
type KbAnalyticsOverview = z.infer<typeof kbAnalyticsOverviewContract>;
type LinkedDocumentList = z.infer<typeof linkedDocumentListContract>;
type LinkedDocumentDetail = z.infer<typeof linkedDocumentDetailContract>;
type HrKbLinkFlags = z.infer<typeof hrKbLinkFlagsContract>;
type KbPageCollection = z.infer<typeof kbPageCollectionResponseSchema>;
type KbTrashPageList = z.infer<typeof kbTrashPageListContract>;
type ContentHealthCounts = z.infer<typeof contentHealthCountsContract>;
type KbPageReviewList = z.infer<typeof kbPageReviewListContract>;
type KbPageTemplateListPage = z.infer<typeof kbPageTemplateListPageContract>;
type KbResearchBriefList = z.infer<typeof kbResearchBriefListContract>;
type KbResearchBriefDetail = z.infer<typeof kbResearchBriefDetailContract>;
type KbConversationListPage = z.infer<typeof kbConversationListPageContract>;
type KbPageWithAncestors = z.infer<typeof kbPageWithAncestorsContract>;
type KbPageVersionList = z.infer<typeof kbPageVersionListContract>;
type KbSpaceFull = z.infer<typeof kbSpaceFullContract>;
type KbSharingSettings = z.infer<typeof sharingSettingsContract>;

export async function prefetchKbHome() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("kb:pages:view"))
      return dehydrate(await createServerQueryClient());
    await Promise.all([
      queryClient.prefetchQuery({
        ...kbPagesRecentQueryOptions,
        queryFn: () =>
          serverGet<KbPageList>("/kb/pages/recent", kbPageListContract),
      }),
      queryClient.prefetchInfiniteQuery({
        ...kbPagesFavoritesQueryOptions,
        queryFn: () =>
          serverGet<KbFavoritePageList>(
            "/kb/pages/favorites",
            kbFavoritePageListContract,
          ),
        pages: 1,
      }),
    ]);
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchKbSpaces() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("kb:spaces:view"))
      return dehydrate(await createServerQueryClient());
    await queryClient.prefetchQuery({
      ...kbSpacesListQueryOptions({}),
      queryFn: () =>
        serverGet<KbSpaceListPage>("/kb/spaces", kbSpaceListPageContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchKbAnalytics() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("kb:analytics:view"))
      return dehydrate(await createServerQueryClient());
    await Promise.all([
      queryClient.prefetchQuery({
        ...kbAnalyticsOverviewQueryOptions({}),
        queryFn: () =>
          serverGet<KbAnalyticsOverview>(
            "/kb/analytics/overview",
            kbAnalyticsOverviewContract,
          ),
      }),
      gate.can("kb:spaces:view") &&
        queryClient.prefetchQuery({
          ...kbSpacesListQueryOptions({}),
          queryFn: () =>
            serverGet<KbSpaceListPage>("/kb/spaces", kbSpaceListPageContract),
        }),
    ]);
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchKbCompanyDocuments() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("kb:pages:view"))
      return dehydrate(await createServerQueryClient());
    await Promise.all([
      queryClient.prefetchQuery({
        ...kbHrLinkConfigQueryOptions,
        queryFn: () =>
          serverGet<HrKbLinkFlags>("/kb/hr-link/config", hrKbLinkFlagsContract),
      }),
      queryClient.prefetchQuery({
        ...kbLinkedDocumentsQueryOptions({ limit: 30 }),
        queryFn: () =>
          serverGet<LinkedDocumentList>(
            "/kb/linked-documents?limit=30",
            linkedDocumentListContract,
          ),
      }),
    ]);
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchKbCompanyDocumentDetail(id: number) {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("kb:pages:view"))
      return dehydrate(await createServerQueryClient());
    await Promise.all([
      queryClient.prefetchQuery({
        ...kbHrLinkConfigQueryOptions,
        queryFn: () =>
          serverGet<HrKbLinkFlags>("/kb/hr-link/config", hrKbLinkFlagsContract),
      }),
      queryClient.prefetchQuery({
        ...kbLinkedDocumentQueryOptions(id),
        queryFn: () =>
          serverGet<LinkedDocumentDetail>(
            `/kb/linked-documents/${id}`,
            linkedDocumentDetailContract,
          ),
      }),
    ]);
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchKbPrivatePages() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("kb:pages:view"))
      return dehydrate(await createServerQueryClient());
    const pageParams = { owner: "me", sort: "updated_desc", limit: 50 };
    await Promise.all([
      gate.can("kb:spaces:view") &&
        queryClient.prefetchQuery({
          ...kbSpacesListQueryOptions({}),
          queryFn: () =>
            serverGet<KbSpaceListPage>("/kb/spaces", kbSpaceListPageContract),
        }),
      queryClient.prefetchQuery({
        ...kbPageCollectionQueryOptions(pageParams),
        queryFn: () =>
          serverGet<KbPageCollection>(
            "/kb/pages?owner=me&sort=updated_desc&limit=50",
            kbPageCollectionResponseSchema,
          ),
      }),
    ]);
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchKbSharedPages() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("kb:pages:view"))
      return dehydrate(await createServerQueryClient());
    const pageParams = { sharedWithMe: "1", sort: "updated_desc", limit: 50 };
    await Promise.all([
      gate.can("kb:spaces:view") &&
        queryClient.prefetchQuery({
          ...kbSpacesListQueryOptions({}),
          queryFn: () =>
            serverGet<KbSpaceListPage>("/kb/spaces", kbSpaceListPageContract),
        }),
      queryClient.prefetchQuery({
        ...kbPageCollectionQueryOptions(pageParams),
        queryFn: () =>
          serverGet<KbPageCollection>(
            "/kb/pages?sharedWithMe=1&sort=updated_desc&limit=50",
            kbPageCollectionResponseSchema,
          ),
      }),
    ]);
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchKbTrash() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("kb:pages:view"))
      return dehydrate(await createServerQueryClient());
    await queryClient.prefetchQuery({
      ...kbPagesTrashQueryOptions(),
      queryFn: () =>
        serverGet<KbTrashPageList>("/kb/pages/trash", kbTrashPageListContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchKbContentHealth() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("kb:pages:manage"))
      return dehydrate(await createServerQueryClient());
    await queryClient.prefetchQuery({
      ...kbContentHealthCountsQueryOptions,
      queryFn: () =>
        serverGet<ContentHealthCounts>(
          "/kb/wiki/content-health/counts",
          contentHealthCountsContract,
        ),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchKbReviews() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("kb:reviews:view"))
      return dehydrate(await createServerQueryClient());
    await queryClient.prefetchQuery({
      ...kbPageReviewsQueryOptions({ limit: 50, sortDir: "asc" }),
      queryFn: () =>
        serverGet<KbPageReviewList>(
          "/kb/page-reviews?limit=50&sortDir=asc",
          kbPageReviewListContract,
        ),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchKbTemplates() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("kb:pages:view"))
      return dehydrate(await createServerQueryClient());
    await queryClient.prefetchInfiniteQuery({
      ...kbPageTemplatesQueryOptions(),
      queryFn: () =>
        serverGet<KbPageTemplateListPage>(
          "/kb/page-templates",
          kbPageTemplateListPageContract,
        ),
      pages: 1,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchKbSharingSettings() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("kb:settings:manage"))
      return dehydrate(await createServerQueryClient());
    await queryClient.prefetchQuery({
      ...kbSharingSettingsQueryOptions,
      queryFn: () =>
        serverGet<KbSharingSettings>(
          "/kb/settings/sharing",
          sharingSettingsContract,
        ),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchKbResearchBriefs() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("kb:pages:view"))
      return dehydrate(await createServerQueryClient());
    await queryClient.prefetchInfiniteQuery({
      ...kbResearchBriefsQueryOptions,
      queryFn: () =>
        serverGet<KbResearchBriefList>(
          "/kb/research-briefs?limit=20",
          kbResearchBriefListContract,
        ),
      pages: 1,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchKbResearchBriefDetail(briefId: number) {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("kb:pages:view"))
      return dehydrate(await createServerQueryClient());
    await queryClient.prefetchQuery({
      ...kbResearchBriefQueryOptions(briefId),
      queryFn: () =>
        serverGet<KbResearchBriefDetail>(
          `/kb/research-briefs/${briefId}`,
          kbResearchBriefDetailContract,
        ),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchKbConversations() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("kb:ai:generate"))
      return dehydrate(await createServerQueryClient());
    await queryClient.prefetchInfiniteQuery({
      ...kbConversationsQueryOptions,
      queryFn: () =>
        serverGet<KbConversationListPage>(
          "/kb/ask/conversations?limit=30",
          kbConversationListPageContract,
        ),
      pages: 1,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchKbPageDetail(pageId: number) {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("kb:pages:view"))
      return dehydrate(await createServerQueryClient());
    await queryClient.prefetchQuery({
      ...kbPageQueryOptions(pageId),
      queryFn: () =>
        serverGet<KbPageWithAncestors>(
          `/kb/pages/${pageId}`,
          kbPageWithAncestorsContract,
        ),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchKbPageHistory(pageId: number) {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("kb:pages:view"))
      return dehydrate(await createServerQueryClient());
    await queryClient.prefetchInfiniteQuery({
      ...kbPageVersionsQueryOptions(pageId),
      queryFn: () =>
        serverGet<KbPageVersionList>(
          `/kb/pages/${pageId}/versions`,
          kbPageVersionListContract,
        ),
      pages: 1,
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchKbSpaceDetail(spaceId: number) {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("kb:spaces:view"))
      return dehydrate(await createServerQueryClient());
    await queryClient.prefetchQuery({
      ...kbSpaceQueryOptions(spaceId),
      queryFn: () =>
        serverGet<KbSpaceFull>(`/kb/spaces/${spaceId}`, kbSpaceFullContract),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}

export async function prefetchKbSearchPage() {
  try {
    const [queryClient, gate] = await Promise.all([
      createServerQueryClient(),
      resolvePrefetchGate(),
    ]);
    if (!gate.can("kb:pages:view") || !gate.can("kb:spaces:view"))
      return dehydrate(await createServerQueryClient());
    await queryClient.prefetchQuery({
      ...kbSpacesListQueryOptions({ limit: 100 }),
      queryFn: () =>
        serverGet<KbSpaceListPage>(
          "/kb/spaces?limit=100",
          kbSpaceListPageContract,
        ),
    });
    return dehydrate(queryClient);
  } catch {
    return dehydrate(await createServerQueryClient());
  }
}
