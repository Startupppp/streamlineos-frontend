import React from "react";
import { render, screen } from "@testing-library/react";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => jest.requireMock("@fortune-sheet/react").Workbook),
}));

jest.mock("@fortune-sheet/react", () => ({
  Workbook: ({ allowEdit }: { allowEdit?: boolean }) => (
    <div data-testid="fortune-workbook" data-editable={String(!!allowEdit)} />
  ),
}));

jest.mock("@fortune-sheet/react/dist/index.css", () => ({}), { virtual: true });

const mockCanState = jest.fn<"loading" | "allowed" | "denied", [string]>(() => "allowed");
const mockUseCan = jest.fn<boolean, [string]>(() => true);
jest.mock("@/hooks/api/access", () => ({
  useCanState: (key: string) => mockCanState(key),
  useCan: (key: string) => mockUseCan(key),
}));

const mockRefetch = jest.fn().mockResolvedValue({ isSuccess: true, data: null });
const mockKbPage = jest.fn();
const mockKbWorkbook = jest.fn();
jest.mock("@/hooks/api/kb/pages", () => ({
  useKbPage: (id: number) => mockKbPage(id),
  useUpdateKbPage: () => ({ mutateAsync: jest.fn() }),
  useRecordKbPageVisit: () => ({ mutate: jest.fn() }),
}));

jest.mock("@/hooks/api/kb/workbook", () => ({
  useKbWorkbook: (id: number) => mockKbWorkbook(id),
  useUpdateKbWorkbook: () => ({ mutateAsync: jest.fn() }),
  useReplaceKbWorkbook: () => ({ mutateAsync: jest.fn() }),
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ title }: { title: string }) => <div>{title}</div>,
}));

jest.mock("./use-page-autosave", () => ({
  usePageAutosave: () => ({
    saveState: "idle",
    conflict: null,
    savedAt: null,
    isOffline: false,
    pendingFields: [],
    schedule: jest.fn(),
    retry: jest.fn(),
    discardLocalEdits: jest.fn(),
    keepLocalEdits: jest.fn(),
  }),
}));

jest.mock("./use-page-presentation-update", () => ({
  usePagePresentationUpdate: () => ({
    pendingPresentation: null,
    isRetryingPresentation: false,
    handleCoverChange: jest.fn(),
    handleIconChange: jest.fn(),
    handleRetryPresentation: jest.fn(),
    discardPresentation: jest.fn(),
  }),
}));

jest.mock("./page-document-header", () => ({
  __esModule: true,
  default: ({ page: p }: { page: KbPageDetail }) => <div data-testid="page-header">{p.title}</div>,
}));

jest.mock("./page-right-panel", () => ({
  __esModule: true,
  default: () => <div data-testid="page-right-panel" />,
}));

jest.mock("./page-cover", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("./page-cover-picker", () => ({
  PageCoverPickerDialog: () => null,
}));

jest.mock("./page-edit-conflict", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("./kb-page-not-found", () => ({
  KbPageNotFound: () => <div>Not found</div>,
}));

jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: () => <div>No permission</div>,
}));

jest.mock("./page-icon-picker", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("./page-document-property-actions", () => ({
  PageDocumentPropertyActions: () => null,
}));

jest.mock("@/features/wiki/lib/kb-spreadsheet-file", () => ({
  exportSpreadsheet: jest.fn(),
}));

function basePage(overrides: Partial<KbPageDetail> = {}): KbPageDetail {
  return {
    id: 42,
    orgId: "org1",
    spaceId: null,
    parentPageId: null,
    sortOrder: null,
    projectId: null,
    title: "My Sheet",
    icon: null,
    coverImage: null,
    status: "published",
    contentType: "spreadsheet",
    kind: "spreadsheet",
    trustState: "unverified",
    visibility: "org",
    publicToken: null,
    publicSlug: null,
    content: null,
    contentText: null,
    isLocked: false,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    deletedAt: null,
    createdByMembershipId: null,
    lastEditedByMembershipId: null,
    deletedByMembershipId: null,
    ownerMembershipId: null,
    verifiedByMembershipId: null,
    createdById: null,
    lastEditedById: null,
    deletedById: null,
    ownerUserId: null,
    verifiedById: null,
    verifiedUntil: null,
    nextReviewAt: null,
    aclRevision: 1,
    contentRevision: 1,
    legalHold: false,
    legalHoldReason: null,
    ancestors: [],
    isFavorite: false,
    can: { view: true, comment: true, edit: true, manage: true, restore: true },
    access: { via: "organization", grantExpiresAt: null },
    ...overrides,
  };
}

const baseWorkbook = { pageId: 42, contentRevision: 1, sheets: [] };

import PageSpreadsheet from "./page-spreadsheet";

describe("PageSpreadsheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanState.mockReturnValue("allowed");
    mockUseCan.mockReturnValue(true);
    mockKbWorkbook.mockReturnValue({ data: baseWorkbook, isLoading: false, isError: false, error: null, refetch: jest.fn() });
  });

  it("renders the fortune workbook when page loads", () => {
    mockKbPage.mockReturnValue({ data: basePage(), isLoading: false, isError: false, error: null, refetch: mockRefetch });
    render(<PageSpreadsheet pageId={42} />);
    expect(screen.getByTestId("fortune-workbook")).toBeInTheDocument();
  });

  it("renders workbook as editable when can.edit is true", () => {
    mockKbPage.mockReturnValue({ data: basePage({ can: { view: true, comment: true, edit: true, manage: true, restore: true } }), isLoading: false, isError: false, error: null, refetch: mockRefetch });
    mockUseCan.mockReturnValue(true);
    render(<PageSpreadsheet pageId={42} />);
    expect(screen.getByTestId("fortune-workbook").dataset.editable).toBe("true");
  });

  it("renders workbook as read-only when can.edit is false", () => {
    mockKbPage.mockReturnValue({ data: basePage({ can: { view: true, comment: true, edit: false, manage: false, restore: false } }), isLoading: false, isError: false, error: null, refetch: mockRefetch });
    render(<PageSpreadsheet pageId={42} />);
    expect(screen.getByTestId("fortune-workbook").dataset.editable).toBe("false");
  });

  it("renders workbook as read-only when useCan returns false for update permission", () => {
    mockKbPage.mockReturnValue({ data: basePage(), isLoading: false, isError: false, error: null, refetch: mockRefetch });
    mockUseCan.mockImplementation((key: string) => key !== "kb:pages:update");
    render(<PageSpreadsheet pageId={42} />);
    expect(screen.getByTestId("fortune-workbook").dataset.editable).toBe("false");
  });

  it("shows loading state while fetching", () => {
    mockKbPage.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null, refetch: mockRefetch });
    render(<PageSpreadsheet pageId={42} />);
    expect(screen.queryByTestId("fortune-workbook")).toBeNull();
  });

  it("shows not-found when isError is true", () => {
    mockKbPage.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: new Error("not found"), refetch: mockRefetch });
    render(<PageSpreadsheet pageId={42} />);
    expect(screen.getByText("Not found")).toBeInTheDocument();
  });

  it("shows no-permission state when access is denied", () => {
    mockKbPage.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null, refetch: mockRefetch });
    mockCanState.mockReturnValue("denied");
    render(<PageSpreadsheet pageId={42} />);
    expect(screen.getByText("No permission")).toBeInTheDocument();
  });

  it("shows a skeleton instead of an empty grid while the workbook is loading", () => {
    mockKbPage.mockReturnValue({ data: basePage(), isLoading: false, isError: false, error: null, refetch: mockRefetch });
    mockKbWorkbook.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null, refetch: jest.fn() });
    render(<PageSpreadsheet pageId={42} />);
    expect(screen.queryByTestId("fortune-workbook")).toBeNull();
    expect(screen.queryByText("Couldn't load this spreadsheet")).toBeNull();
  });

  it("shows an inline error instead of an empty grid when the workbook read fails", () => {
    mockKbPage.mockReturnValue({ data: basePage(), isLoading: false, isError: false, error: null, refetch: mockRefetch });
    mockKbWorkbook.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: new Error("boom"), refetch: jest.fn() });
    render(<PageSpreadsheet pageId={42} />);
    expect(screen.queryByTestId("fortune-workbook")).toBeNull();
    expect(screen.getByText("Couldn't load this spreadsheet")).toBeInTheDocument();
  });
});
