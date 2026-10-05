import {
  currentSearchRef,
  mockIsApiError,
  mockUseCan,
  mockUseOnlineStatus,
  mockUsePageState,
  mockUsePortalSettings,
  mockUseProjectClientGrants,
  mockUsePublishPortal,
  mockUseUnpublishPortal,
  mockUsePortalPreview,
} from "./client-portal-management-page-test-harness";

export const UNPUBLISHED_SETTINGS = {
  portalPublishedAt: null,
  grantCount: 0,
};

export const PUBLISHED_SETTINGS = {
  portalPublishedAt: "2024-06-01T00:00:00.000Z",
  grantCount: 2,
};

export const SAMPLE_GRANT = {
  projectClientGrantId: "grant-abc-123",
  organizationId: "org-1",
  portalMembershipId: "mem-1",
  partyContactId: "contact-1",
  projectId: 1,
  canViewMilestones: true,
  canViewTasks: true,
  canViewAttachments: false,
  canViewComments: false,
  canSubmitChangeRequests: false,
  status: "ACTIVE" as const,
  expiresAt: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  contactFirstName: "Jane",
  contactLastName: "Smith",
};

export const GRANTS_PAGE = {
  data: [SAMPLE_GRANT],
  pagination: { limit: 50, nextCursor: null, hasMore: false },
};

export function baseQuery(overrides = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    ...overrides,
  };
}

export function baseMutation(overrides = {}) {
  return {
    mutate: jest.fn(),
    isPending: false,
    isError: false,
    error: undefined,
    ...overrides,
  };
}

export function installClientPortalMocks() {
  jest.clearAllMocks();
  mockIsApiError.mockReturnValue(false);
  currentSearchRef.current = new URLSearchParams();
  mockUseCan.mockReturnValue(true);
  mockUseOnlineStatus.mockReturnValue(true);
  mockUsePageState.mockReturnValue({ kind: "ready" });
  mockUsePortalSettings.mockReturnValue(baseQuery({ data: UNPUBLISHED_SETTINGS }));
  mockUseProjectClientGrants.mockReturnValue(
    baseQuery({ data: { data: [], pagination: { limit: 50, nextCursor: null, hasMore: false } } }),
  );
  mockUsePublishPortal.mockReturnValue(baseMutation());
  mockUseUnpublishPortal.mockReturnValue(baseMutation());
  mockUsePortalPreview.mockReturnValue(
    baseQuery({
      data: {
        project: { id: 1, name: "P", key: "P", status: "active", startDate: null, targetEndDate: null },
        milestones: [],
        tasks: [],
        attachments: [],
        comments: [],
      },
    }),
  );
}
