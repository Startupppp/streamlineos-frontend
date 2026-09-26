import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import type { DocumentKbLinkState } from "@/hooks/api/hr/document-kb-link";
import { DocumentKbLinkPanel } from "./document-kb-link-panel";

const mockToast = { success: jest.fn(), error: jest.fn() };
jest.mock("sonner", () => ({ toast: { success: (m: string) => mockToast.success(m), error: (m: string) => mockToast.error(m) } }));

const mockCan = jest.fn<boolean, [string]>();
jest.mock("@/hooks/api/access", () => ({ useCan: (key: string) => mockCan(key) }));

const mockState = jest.fn();
const mockPublish = jest.fn();
const mockWithdraw = jest.fn();
jest.mock("@/hooks/api/hr/document-kb-link", () => ({
  useDocumentKbLink: () => mockState(),
  usePublishDocumentToKb: () => ({ mutateAsync: mockPublish, isPending: false }),
  useWithdrawDocumentFromKb: () => ({ mutateAsync: mockWithdraw, isPending: false }),
  useRetargetDocumentKbLink: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("./document-kb-retarget-panel", () => ({
  DocumentKbRetargetPanel: () => <button type="button">Change settings</button>,
}));

function stateFixture(over: Partial<DocumentKbLinkState> = {}): DocumentKbLinkState {
  return {
    documentId: 7,
    link: null,
    publishable: true,
    blockers: [],
    documentAudiences: [{ kind: "ALL_EMPLOYEES", refId: null, label: null }],
    ...over,
  };
}

const liveLink: NonNullable<DocumentKbLinkState["link"]> = {
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

function renderPanel(data: DocumentKbLinkState | undefined, extra: Record<string, unknown> = {}) {
  mockState.mockReturnValue({ data, isError: false, error: null, ...extra });
  render(<DocumentKbLinkPanel documentId={7} documentName="Code of Conduct" />);
}

// The dialog's confirm button carries the same label as the button that opened it, and renders last.
async function confirmButton(name: string): Promise<HTMLElement> {
  const buttons = await screen.findAllByRole("button", { name });
  const last = buttons.at(-1);
  if (!last) throw new Error(`No button named ${name}`);
  return last;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCan.mockImplementation((key) => key === "hr:documents:publish");
  mockPublish.mockResolvedValue(stateFixture({ link: liveLink }));
  mockWithdraw.mockResolvedValue(stateFixture());
});

describe("DocumentKbLinkPanel", () => {
  it("offers to add a shareable document, and adds it only after the person confirms", async () => {
    renderPanel(stateFixture());

    expect(screen.getByText("Not shared")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Add to Knowledge Base" }));
    expect(mockPublish).not.toHaveBeenCalled();
    fireEvent.click(await confirmButton("Add to Knowledge Base"));

    await waitFor(() => expect(mockPublish).toHaveBeenCalledWith({ documentId: 7 }));
    expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining("Code of Conduct"));
  });

  it("gives the server's reasons and no way to add when the document cannot be shared", () => {
    renderPanel(
      stateFixture({
        publishable: false,
        blockers: [{ code: "BELONGS_TO_AN_EMPLOYEE", message: "This document belongs to an employee." }],
      }),
    );

    expect(screen.getByText("It cannot be shared yet")).toBeInTheDocument();
    expect(screen.getByText("This document belongs to an employee.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add to Knowledge Base" })).toBeDisabled();
  });

  it("says who a live entry is visible to, links to it, and offers removal instead of adding", () => {
    renderPanel(stateFixture({ link: liveLink }));

    expect(screen.getByText("Shared")).toBeInTheDocument();
    expect(screen.getByText(/visible to all employees/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See it there" })).toHaveAttribute("href", expect.stringContaining("31"));
    expect(screen.queryByRole("button", { name: "Add to Knowledge Base" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove from Knowledge Base" })).toBeInTheDocument();
  });

  it("says a taken-down entry stopped being shareable rather than pretending it never existed", () => {
    renderPanel(
      stateFixture({
        link: { ...liveLink, status: "unpublished", unpublishReason: "source_no_longer_publishable" },
        publishable: false,
        blockers: [{ code: "CLASSIFICATION_NOT_SHAREABLE", message: "Only Internal or Restricted documents can be shared." }],
      }),
    );

    expect(screen.getByText(/taken down when it stopped being shareable/i)).toBeInTheDocument();
    expect(screen.getByText("Not shared")).toBeInTheDocument();
  });

  it("warns that nobody would see an entry whose document has no audience yet", () => {
    renderPanel(stateFixture({ documentAudiences: [] }));

    expect(screen.getByText("Nobody would see it yet")).toBeInTheDocument();
  });

  it("removes a live entry only after confirmation, and sends the reason that was typed", async () => {
    renderPanel(stateFixture({ link: liveLink }));

    fireEvent.click(screen.getByRole("button", { name: "Remove from Knowledge Base" }));
    expect(mockWithdraw).not.toHaveBeenCalled();
    fireEvent.change(await screen.findByLabelText("Reason"), { target: { value: "  Replaced by the 2026 handbook  " } });
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(mockWithdraw).toHaveBeenCalledWith({ documentId: 7, reason: "Replaced by the 2026 handbook" }));
    expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining("removed"));
  });

  it("will not remove an entry without a reason, and says why, so the audit log always has one", async () => {
    renderPanel(stateFixture({ link: liveLink }));

    fireEvent.click(screen.getByRole("button", { name: "Remove from Knowledge Base" }));
    fireEvent.change(await screen.findByLabelText("Reason"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(await screen.findByText(/say why it is being taken out/i)).toBeInTheDocument();
    expect(mockWithdraw).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });

  it("starts each removal with an empty reason, not the last one", async () => {
    renderPanel(stateFixture({ link: liveLink }));
    fireEvent.click(screen.getByRole("button", { name: "Remove from Knowledge Base" }));
    fireEvent.change(await screen.findByLabelText("Reason"), { target: { value: "first" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByRole("button", { name: "Remove from Knowledge Base" }));

    expect(await screen.findByLabelText("Reason")).toHaveValue("");
    expect(mockWithdraw).not.toHaveBeenCalled();
  });

  it("keeps the reason that was typed when the removal fails, so it is not written twice", async () => {
    mockWithdraw.mockRejectedValue(new ApiError("Could not reach the service.", 503, "UNAVAILABLE", { correlationId: "req-w1" }, "/hr/documents/7/kb-link"));
    renderPanel(stateFixture({ link: liveLink }));
    fireEvent.click(screen.getByRole("button", { name: "Remove from Knowledge Base" }));
    fireEvent.change(await screen.findByLabelText("Reason"), { target: { value: "Replaced by the 2026 handbook" } });
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(await screen.findByText("Not done")).toBeInTheDocument();
    expect(screen.getByText("req-w1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove from Knowledge Base" }));

    expect(await screen.findByLabelText("Reason")).toHaveValue("Replaced by the 2026 handbook");
  });

  it("shows what a person wrote when they withdrew an entry, and not the server's own code", () => {
    renderPanel(stateFixture({ link: { ...liveLink, status: "unpublished", unpublishReason: "Replaced by the 2026 handbook" }, publishable: true }));

    expect(screen.getByText(/has been withdrawn: Replaced by the 2026 handbook/)).toBeInTheDocument();
  });

  it("does not show a withdrawal reason to someone who may not publish documents", () => {
    mockCan.mockReturnValue(false);
    renderPanel(stateFixture({ link: { ...liveLink, status: "unpublished", unpublishReason: "Contains an outdated salary table" }, publishable: true }));

    expect(screen.getByText("This document was shared before and has been withdrawn.")).toBeInTheDocument();
    expect(screen.queryByText(/outdated salary table/)).not.toBeInTheDocument();
  });

  it("does not present the code for an unexplained withdrawal as if someone had written it", () => {
    renderPanel(stateFixture({ link: { ...liveLink, status: "unpublished", unpublishReason: "manual" }, publishable: true }));

    expect(screen.getByText("This document was shared before and has been withdrawn.")).toBeInTheDocument();
    expect(screen.queryByText(/manual/)).not.toBeInTheDocument();
  });

  it("shows the message and a copyable reference when the server refuses to add", async () => {
    mockPublish.mockRejectedValue(new ApiError("This document cannot be shared with the company.", 422, "DOCUMENT_NOT_PUBLISHABLE", { correlationId: "req-77c1" }, "/hr/documents/7/kb-link"));
    renderPanel(stateFixture());

    fireEvent.click(screen.getByRole("button", { name: "Add to Knowledge Base" }));
    fireEvent.click(await confirmButton("Add to Knowledge Base"));

    expect(await screen.findByText("Not done")).toBeInTheDocument();
    expect(screen.getByText("req-77c1")).toBeInTheDocument();
    expect(mockToast.error).toHaveBeenCalled();
  });

  it("leaves adding and removing to people who may publish, and says so", () => {
    mockCan.mockReturnValue(false);
    renderPanel(stateFixture());

    expect(screen.queryByRole("button", { name: "Add to Knowledge Base" })).not.toBeInTheDocument();
    expect(screen.getByText(/needs the permission to publish documents/i)).toBeInTheDocument();
  });

  it("shows no actions while the status is still loading", () => {
    renderPanel(undefined);

    expect(screen.queryByText("Knowledge Base")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add to Knowledge Base" })).not.toBeInTheDocument();
  });

  it("shows why the status could not load, with its reference", () => {
    renderPanel(undefined, { isError: true, error: new ApiError("Server error", 500, "INTERNAL", { correlationId: "req-5e" }, "/hr/documents/7/kb-link") });

    expect(screen.getByText("Could not load the Knowledge Base status")).toBeInTheDocument();
    expect(screen.getByText("req-5e")).toBeInTheDocument();
  });
});
