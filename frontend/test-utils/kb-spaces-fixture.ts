import type { KbSpaceListItem, KbSpaceListPage } from "@/hooks/api/kb/kb-spaces-settings-schema";

export function kbSpaceListItem(
  overrides: Partial<KbSpaceListItem> & Pick<KbSpaceListItem, "id" | "name">,
): KbSpaceListItem {
  return {
    slug: `space-${overrides.id}`,
    description: null,
    audience: "internal",
    icon: null,
    isPublicHelpCenter: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    archivedAt: null,
    articleCount: 0,
    pageCount: 0,
    memberCount: 0,
    ownerName: null,
    pagesOverdueForReview: 0,
    ...overrides,
  };
}

export const KB_SPACES_FIXTURE: KbSpaceListItem[] = [
  kbSpaceListItem({ id: 1, name: "Engineering" }),
  kbSpaceListItem({ id: 2, name: "Product" }),
];

export function kbSpacesPage(
  spaces: KbSpaceListItem[] = KB_SPACES_FIXTURE,
): KbSpaceListPage {
  return {
    data: spaces,
    pagination: { limit: 100, hasMore: false, nextCursor: null },
  };
}

export function kbSpacesQueryStub(spaces: KbSpaceListItem[] = KB_SPACES_FIXTURE) {
  return {
    data: kbSpacesPage(spaces),
    isLoading: false,
    isError: false,
    error: null,
  };
}
