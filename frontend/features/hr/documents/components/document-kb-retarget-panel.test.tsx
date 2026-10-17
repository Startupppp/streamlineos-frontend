import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import type { DocumentKbLinkState } from "@/hooks/api/hr/document-kb-link";
import { DocumentKbRetargetPanel } from "./document-kb-retarget-panel";

const mockToast = { success: jest.fn(), error: jest.fn() };
jest.mock("sonner", () => ({ toast: { success: (m: string) => mockToast.success(m), error: (m: string) => mockToast.error(m) } }));

const mockCan = jest.fn<boolean, [string]>();
jest.mock("@/hooks/api/access", () => ({ useCan: (key: string) => mockCan(key) }));

const mockRetarget = jest.fn();
jest.mock("@/hooks/api/hr/document-kb-link", () => ({
  useRetargetDocumentKbLink: () => ({ mutateAsync: mockRetarget, isPending: false }),
}));

function mockUnitList(units: Array<{ id: string; name: string }> = []) {
  return {
    data: units.length > 0 ? { data: units, pageInfo: { hasMore: false } } : undefined,
    isPending: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
}
jest.mock("@/hooks/api/org-hierarchy-units", () => ({
  useOrgDepartments: () => mockUnitList(),
}));
jest.mock("@/hooks/api/org-hierarchy", () => ({
  useOrgLocations: () => mockUnitList(),
}));

const followLatestLink: NonNullable<DocumentKbLinkState["link"]> = {
  id: 31,
  status: "active",
  versionMode: "FOLLOW_LATEST",
  pinnedVersion: null,
  audiences: [{ kind: "ALL_EMPLOYEES", refId: null, label: null }],
  publishedAt: "2026-09-01T00:00:00.000Z",
  unpublishedAt: null,
  unpublishReason: null,
  newerVersionAvailable: false,
};

const pinnedLink: NonNullable<DocumentKbLinkState["link"]> = {
  ...followLatestLink,
  versionMode: "PINNED",
  pinnedVersion: 2,
  audiences: [{ kind: "ALL_EMPLOYEES", refId: null, label: null }],
};

function renderPanel(link: NonNullable<DocumentKbLinkState["link"]> = followLatestLink) {
  render(<DocumentKbRetargetPanel documentId={7} link={link} documentName="Code of Conduct" />);
}

async function openSheet() {
  fireEvent.click(screen.getByRole("button", { name: "Change settings" }));
  return screen.findByRole("button", { name: "Save settings" });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCan.mockImplementation((key) => key === "hr:documents:publish");
  mockRetarget.mockResolvedValue({});
});

describe("DocumentKbRetargetPanel", () => {
  it("sends a PATCH to retarget the audience without issuing a DELETE or re-POST", async () => {
    renderPanel();
    await openSheet();

    fireEvent.click(screen.getByRole("radio", { name: /hr only/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    await waitFor(() =>
      expect(mockRetarget).toHaveBeenCalledWith({ documentId: 7, audiences: [] }),
    );
    expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining("Code of Conduct"));
  });

  it("disables the submit button when neither audience nor version has changed, so no empty body reaches the server", async () => {
    renderPanel();
    const saveBtn = await openSheet();

    expect(saveBtn).toBeDisabled();
    expect(mockRetarget).not.toHaveBeenCalled();
  });

  it("blocks submission when versionMode is PINNED but no version number is provided", async () => {
    renderPanel();
    await openSheet();

    fireEvent.click(screen.getByRole("radio", { name: /pinned version/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    expect(await screen.findByText(/version number is required/i)).toBeInTheDocument();
    expect(mockRetarget).not.toHaveBeenCalled();
  });

  it("sends pinnedVersion in the body when versionMode is PINNED and the number is provided", async () => {
    renderPanel();
    await openSheet();

    fireEvent.click(screen.getByRole("radio", { name: /pinned version/i }));
    fireEvent.change(screen.getByRole("spinbutton", { name: /version number/i }), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    await waitFor(() =>
      expect(mockRetarget).toHaveBeenCalledWith({
        documentId: 7,
        versionMode: "PINNED",
        pinnedVersion: 3,
      }),
    );
  });

  it("does not include pinnedVersion in the body when switching from PINNED to FOLLOW_LATEST", async () => {
    renderPanel(pinnedLink);
    await openSheet();

    fireEvent.click(screen.getByRole("radio", { name: /follow latest/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    await waitFor(() =>
      expect(mockRetarget).toHaveBeenCalledWith({
        documentId: 7,
        versionMode: "FOLLOW_LATEST",
      }),
    );
    const callArg = mockRetarget.mock.calls[0][0] as Record<string, unknown>;
    expect("pinnedVersion" in callArg).toBe(false);
  });

  it("shows the Change settings button to a person who can publish documents", () => {
    mockCan.mockReturnValue(true);
    renderPanel();

    expect(screen.getByRole("button", { name: "Change settings" })).toBeInTheDocument();
  });

  it("hides the Change settings button entirely from someone without hr:documents:publish", () => {
    mockCan.mockReturnValue(false);
    renderPanel();

    expect(screen.queryByRole("button", { name: "Change settings" })).not.toBeInTheDocument();
  });

  it("shows the error reference when the server refuses the update", async () => {
    mockRetarget.mockRejectedValue(
      new ApiError("Conflict", 409, "CONFLICT", { correlationId: "req-abc" }, "/hr/documents/7/kb-link"),
    );
    renderPanel();
    await openSheet();

    fireEvent.click(screen.getByRole("radio", { name: /hr only/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save settings" }));

    expect(await screen.findByText("Not done")).toBeInTheDocument();
    expect(screen.getByText("req-abc")).toBeInTheDocument();
    expect(mockToast.error).toHaveBeenCalled();
  });
});
