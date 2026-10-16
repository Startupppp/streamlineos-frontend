import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api-envelope";
import type { AccessState } from "@/lib/rbac/gate";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";
import PageDocument from "./page-document";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/build/7/wiki/42",
}));

jest.mock("next/dynamic", () => () => {
  return function PlateEditorStub({ editable, value, onChange }: { editable: boolean; value: unknown; onChange: (value: unknown, plainText: string) => void }) {
    return <div data-testid="plate-editor" data-editable={editable} data-content={JSON.stringify(value)}><button onClick={() => onChange([{ type: "p", children: [{ text: "My body" }] }], "My body")}>Type body</button></div>;
  };
});

let mockViewAccess: AccessState = "granted";
let mockCanUpdate = true;
jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => key === "kb:pages:update" ? mockCanUpdate : true,
  useCanState: () => mockViewAccess,
}));

const mockUseKbPage = jest.fn();
const mockDiscardLocalEdits = jest.fn();
const mockCompared = jest.fn();
const mockCompareFailed = jest.fn();
let mockConflict: { currentContentRevision: number; lastEditedByName: string | null; lastEditedAt: string | null } | null = null;
jest.mock("@/hooks/api/kb", () => ({
  useKbPage: (pageId: number) => mockUseKbPage(pageId),
  useUpdateKbPage: () => ({ mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false }),
  useRecordKbPageVisit: () => ({ mutate: jest.fn() }),
}));

jest.mock("./use-page-autosave", () => ({
  usePageAutosave: () => ({
    saveState: "idle",
    conflict: mockConflict,
    savedAt: null,
    isOffline: false,
    pendingFields: [],
    schedule: jest.fn(),
    discardLocalEdits: mockDiscardLocalEdits,
    keepLocalEdits: jest.fn(),
  }),
}));

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

jest.mock("@/features/wiki/lib/upload-kb-media", () => ({ uploadKbMedia: jest.fn() }));
jest.mock("@/components/editor/plate/upload-media", () => ({
  withoutPendingUploads: (value: unknown) => value,
}));
jest.mock("@/components/editor/plate/plate-value-convert", () => ({
  normalizePlateValue: (value: unknown) => value ?? [],
  getPlainText: () => "",
  plainTextToPlateValue: (text: string) => [{ type: "p", children: [{ text }] }],
  prependPlateValue: (a: unknown[], b: unknown[]) => [...a, ...b],
}));

jest.mock("./page-cover", () => ({ __esModule: true, default: () => null }));
jest.mock("./page-cover-picker", () => ({ PageCoverPickerDialog: () => null }));
jest.mock("./page-icon-picker", () => ({ __esModule: true, default: () => null }));
jest.mock("./page-document-property-actions", () => ({
  PageDocumentPropertyActions: () => null,
}));
jest.mock("./page-document-outline", () => ({ PageDocumentOutline: () => null }));
jest.mock("./page-document-meta-footer", () => ({
  PageDocumentMetaFooter: () => <div data-testid="meta-footer" />,
}));
jest.mock("./page-document-header", () => ({
  __esModule: true,
  default: () => <div data-testid="document-header" />,
}));
jest.mock("./page-right-panel", () => ({
  __esModule: true,
  default: () => <div data-testid="right-panel" />,
}));
jest.mock("./page-edit-conflict", () => ({ __esModule: true, default: ({ onDiscardMine, onCompare }: { onDiscardMine: () => void; onCompare: () => Promise<{ title: string; body: string }> }) => <><button onClick={onDiscardMine}>Load their version</button><button onClick={() => { void onCompare().then(mockCompared, mockCompareFailed); }}>Compare versions</button></> }));

function makePage(): KbPageDetail {
  return {
    id: 42,
    title: "Deployment runbook",
    icon: null,
    coverImage: null,
    content: null,
    contentText: "one two three",
    status: "published",
    trustState: "verified",
    visibility: "org",
    isFavorite: false,
    canEdit: true,
    isLocked: false,
    ancestors: [],
    contentRevision: 1,
    nextReviewAt: null,
    parentPageId: null,
    projectId: 7,
    publicToken: null,
    spaceId: null,
    updatedAt: "2026-09-01T00:00:00Z",
    lastEditedById: "user-1",
    ownerUserId: "user-1",
  } as unknown as KbPageDetail;
}

beforeEach(() => {
  mockViewAccess = "granted";
  mockCanUpdate = true;
  mockConflict = null;
  mockDiscardLocalEdits.mockClear();
  mockCompared.mockClear();
  mockCompareFailed.mockClear();
  mockUseKbPage.mockReturnValue({
    data: makePage(),
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });
});

describe("PageDocument — conflict reload", () => {
  beforeEach(() => {
    mockConflict = { currentContentRevision: 2, lastEditedByName: "Priya", lastEditedAt: null };
  });

  async function typeLocalDraft() {
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText("Page title"));
    await user.type(screen.getByLabelText("Page title"), "My title");
    await user.click(screen.getByRole("button", { name: "Type body" }));
    return user;
  }

  it.each([
    ["rejected", jest.fn().mockRejectedValue(new ApiError("Offline", 503))],
    ["resolved error", jest.fn().mockResolvedValue({ isSuccess: false, isError: true, error: new ApiError("Offline", 503), data: makePage() })],
    ["stale success", jest.fn().mockResolvedValue({ isSuccess: true, isError: false, data: makePage() })],
  ])("keeps the local title and body when the reload has a %s result", async (_kind, refetch) => {
    mockUseKbPage.mockReturnValue({ data: makePage(), isLoading: false, isError: false, error: undefined, refetch });
    render(<PageDocument pageId={42} projectId={7} />);
    const user = await typeLocalDraft();

    await user.click(screen.getByRole("button", { name: "Load their version" }));

    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
    expect(mockDiscardLocalEdits).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Page title")).toHaveValue("My title");
    expect(screen.getByTestId("plate-editor")).toHaveAttribute("data-content", JSON.stringify([{ type: "p", children: [{ text: "My body" }] }]));
    expect(screen.getByRole("button", { name: "Load their version" })).toBeInTheDocument();
  });

  it("loads the server revision after a successful fresh refetch", async () => {
    let currentPage = makePage();
    const freshPage = { ...makePage(), title: "Their title", contentRevision: 2, content: [{ type: "p", children: [{ text: "Their body" }] }] };
    const refetch = jest.fn(async () => {
      currentPage = freshPage;
      return { isSuccess: true, isError: false, data: freshPage };
    });
    mockUseKbPage.mockImplementation(() => ({ data: currentPage, isLoading: false, isError: false, error: undefined, refetch }));
    render(<PageDocument pageId={42} projectId={7} />);
    const user = await typeLocalDraft();

    await user.click(screen.getByRole("button", { name: "Load their version" }));

    await waitFor(() => expect(mockDiscardLocalEdits).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText("Page title")).toHaveValue("Their title");
    expect(screen.getByTestId("plate-editor")).toHaveAttribute("data-content", JSON.stringify(freshPage.content));
  });

  it("rejects a stale comparison read and accepts a fresh one without discarding the draft", async () => {
    const freshPage = { ...makePage(), title: "Their title", contentRevision: 2 };
    const refetch = jest.fn()
      .mockResolvedValueOnce({ isSuccess: true, data: makePage() })
      .mockResolvedValueOnce({ isSuccess: true, data: freshPage });
    mockUseKbPage.mockReturnValue({ data: makePage(), isLoading: false, isError: false, error: undefined, refetch });
    render(<PageDocument pageId={42} projectId={7} />);
    const user = await typeLocalDraft();

    await user.click(screen.getByRole("button", { name: "Compare versions" }));
    await waitFor(() => expect(mockCompareFailed).toHaveBeenCalledTimes(1));
    expect(mockCompared).not.toHaveBeenCalled();
    expect(mockDiscardLocalEdits).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Page title")).toHaveValue("My title");

    await user.click(screen.getByRole("button", { name: "Compare versions" }));
    await waitFor(() => expect(mockCompared).toHaveBeenCalledWith({ title: "Their title", body: "" }));
    expect(mockDiscardLocalEdits).not.toHaveBeenCalled();
  });
});

describe("PageDocument — kb:pages:view denial is not a retryable error", () => {
  it("renders the permission-denied state naming kb:pages:view when access is denied and the disabled read therefore yields no record", () => {
    mockViewAccess = "denied";
    mockUseKbPage.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<PageDocument pageId={42} projectId={7} />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.getByText("kb:pages:view")).toBeInTheDocument();
  });

  it("does not offer a Try again button to a denied viewer because no retry of a disabled query can ever succeed", () => {
    mockViewAccess = "denied";
    mockUseKbPage.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<PageDocument pageId={42} projectId={7} />);

    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
    expect(screen.queryByText("Couldn't load this page")).toBeNull();
  });

  it("renders the document title and editor when kb:pages:view is granted — paired positive control for the two denial tests above", () => {
    render(<PageDocument pageId={42} projectId={7} />);

    expect(screen.getByLabelText("Page title")).toHaveValue("Deployment runbook");
    expect(screen.getByTestId("plate-editor")).toBeInTheDocument();
    expect(screen.queryByText("Access Restricted")).toBeNull();
  });
});

describe("PageDocument — the access snapshot loading window", () => {
  it("renders the loading skeleton and neither a denial nor an error while the access snapshot is still in flight, because a disabled query reports isLoading false", () => {
    mockViewAccess = "loading";
    mockUseKbPage.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    const { container } = render(<PageDocument pageId={42} projectId={7} />);

    expect(container.querySelectorAll(".skeleton-shimmer").length).toBeGreaterThan(0);
    expect(screen.queryByText("Access Restricted")).toBeNull();
    expect(screen.queryByText("Couldn't load this page")).toBeNull();
    expect(screen.queryByText("Page not found")).toBeNull();
  });
});

describe("PageDocument — the title is interactive only when inline rename is authorized", () => {
  it("renders the title read-only when the record denies editing, so an unauthorized reader cannot start a rename", () => {
    mockUseKbPage.mockReturnValue({
      data: { ...makePage(), canEdit: false },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<PageDocument pageId={42} projectId={7} />);

    expect(screen.getByLabelText("Page title")).toHaveAttribute("readonly");
  });

  it("renders the title editable when the record allows editing — paired positive control for the read-only test above", () => {
    render(<PageDocument pageId={42} projectId={7} />);

    expect(screen.getByLabelText("Page title")).not.toHaveAttribute("readonly");
  });
});

describe("PageDocument — edit mode requires role and record permission", () => {
  it("keeps a view-only role in read mode even when the record allows editing", () => {
    mockCanUpdate = false;

    render(<PageDocument pageId={42} projectId={7} />);

    expect(screen.getByLabelText("Page title")).toHaveAttribute("readonly");
    expect(screen.getByTestId("plate-editor")).toHaveAttribute("data-editable", "false");
  });

  it("keeps legacy page responses without canEdit in read mode", () => {
    const { canEdit: _canEdit, ...pageWithoutEditDecision } = makePage();
    mockUseKbPage.mockReturnValue({
      data: pageWithoutEditDecision,
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<PageDocument pageId={42} projectId={7} />);

    expect(screen.getByLabelText("Page title")).toHaveAttribute("readonly");
    expect(screen.getByTestId("plate-editor")).toHaveAttribute("data-editable", "false");
  });
});
describe("PageDocument — record-level misses stay indistinguishable 404s", () => {
  it("renders the not-found state for a 404 when kb:pages:view is granted, so the surface denial branch did not swallow record-level misses", () => {
    mockUseKbPage.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Not found", 404, "NOT_FOUND"),
      refetch: jest.fn(),
    });

    render(<PageDocument pageId={42} projectId={7} />);

    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(screen.queryByText("Access Restricted")).toBeNull();
  });

  it("renders the record-level access-denied copy for a 403 rather than the surface permission state, because the key is held but the record is not shared", () => {
    mockUseKbPage.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Forbidden", 403, "FORBIDDEN"),
      refetch: jest.fn(),
    });

    render(<PageDocument pageId={42} projectId={7} />);

    expect(screen.getByText("You don't have access")).toBeInTheDocument();
    expect(screen.queryByText("Access Restricted")).toBeNull();
  });
});
