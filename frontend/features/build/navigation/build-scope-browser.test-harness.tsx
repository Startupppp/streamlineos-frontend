import { render } from "@testing-library/react";
import { BuildScopeBrowser } from "./build-scope-browser";
import { useBuildScopeDirectory } from "./use-build-scope-directory";
import { useReconciledBuildScopes } from "./use-reconciled-build-scopes";
import {
  useBuildScopeRecents,
  useBuildScopeStars,
} from "./use-build-nav-preferences";
import type {
  BuildScopeDirectory,
  BuildScopeDirectoryEntry,
} from "./use-build-scope-directory";
import type { BuildScopeRef } from "./use-build-nav-preferences";

export const mockUseBuildScopeDirectory =
  useBuildScopeDirectory as jest.MockedFunction<typeof useBuildScopeDirectory>;
export const mockUseReconciledBuildScopes =
  useReconciledBuildScopes as jest.MockedFunction<
    typeof useReconciledBuildScopes
  >;
export const mockUseBuildScopeRecents =
  useBuildScopeRecents as jest.MockedFunction<typeof useBuildScopeRecents>;
export const mockUseBuildScopeStars = useBuildScopeStars as jest.MockedFunction<
  typeof useBuildScopeStars
>;

export function makeEntry(
  overrides: Partial<BuildScopeDirectoryEntry> = {},
): BuildScopeDirectoryEntry {
  return {
    key: "project:1",
    type: "project",
    id: "1",
    name: "Alpha Project",
    parentPath: "Organization",
    parentKey: null,
    projectKey: "ALPHA",
    href: "/build/1",
    isArchived: false,
    ...overrides,
  };
}

export function makeRef(overrides: Partial<BuildScopeRef> = {}): BuildScopeRef {
  return {
    key: "project:1",
    type: "project",
    id: "1",
    name: "Alpha Project",
    parentPath: "Organization",
    parentKey: null,
    projectKey: "ALPHA",
    href: "/build/1",
    ...overrides,
  };
}

export function makeDirectory(
  overrides: Partial<BuildScopeDirectory> = {},
): BuildScopeDirectory {
  return {
    products: [],
    projects: [],
    quarantinedProjects: [],
    isLoading: false,
    isRefreshing: false,
    isError: false,
    isDenied: false,
    hasMoreProjects: false,
    isFetchingMoreProjects: false,
    fetchMoreProjects: jest.fn(),
    hasMoreHierarchy: false,
    isFetchingMoreHierarchy: false,
    fetchMoreHierarchy: jest.fn(),
    hasMoreSearchResults: false,
    isFetchingMoreSearchResults: false,
    fetchMoreSearchResults: jest.fn(),
    refetch: jest.fn(),
    ...overrides,
  };
}

export const DEFAULT_PROPS = {
  currentScopeKey: "organization",
  settingsHrefFor: () => null as string | null,
  onSelect: jest.fn(),
};

export function setupMocks(
  directoryOverrides: Partial<BuildScopeDirectory> = {},
) {
  mockUseBuildScopeDirectory.mockReturnValue(makeDirectory(directoryOverrides));
  mockUseReconciledBuildScopes.mockReturnValue({
    entries: [],
    isReconciled: false,
  });
  mockUseBuildScopeRecents.mockReturnValue({
    recents: [],
    replaceRecents: jest.fn(),
    recordScope: jest.fn(),
  } as ReturnType<typeof useBuildScopeRecents>);
  mockUseBuildScopeStars.mockReturnValue({
    starred: [],
    isStarred: () => false,
    toggleStar: jest.fn(),
    replaceStarred: jest.fn(),
  } as ReturnType<typeof useBuildScopeStars>);
}

export function renderBrowser(props: Partial<typeof DEFAULT_PROPS> = {}) {
  return render(<BuildScopeBrowser {...DEFAULT_PROPS} {...props} />);
}

export function setupExpandable(name = "WS") {
  const product = makeEntry({
    key: "product:p1",
    type: "product",
    name,
    parentKey: null,
  });
  const child = makeEntry({
    key: "project:1",
    name: "ChildProject",
    parentKey: "product:p1",
  });
  setupMocks({ products: [product], projects: [child] });
}
