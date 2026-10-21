import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PageShareLinks } from "./page-share-links";
import { toast } from "sonner";

const createLinkMutate = jest.fn();
const revokeLinkMutate = jest.fn();
const rotateLinkMutate = jest.fn();

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const makeLinks = (count = 0) =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    pageId: 7,
    access: "view" as const,
    allowDownload: false,
    expiresAt: "2027-01-01T00:00:00Z",
    createdAt: "2026-10-01T00:00:00Z",
    revokedAt: null,
    lastAccessedAt: null,
    isExpired: false,
    isRevoked: false,
  }));

jest.mock("@/hooks/api/kb/sharing", () => ({
  useKbPageShareLinks: () => ({
    data: makeLinks(1),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  }),
  useCreateKbShareLink: () => ({ mutate: createLinkMutate, isPending: false }),
  useRevokeKbShareLink: () => ({ mutate: revokeLinkMutate, isPending: false }),
  useRotateKbShareLink: () => ({ mutate: rotateLinkMutate, isPending: false }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PageShareLinks — disabled state", () => {
  it("shows a disabled message when external sharing is off, so the form is not shown", () => {
    render(<PageShareLinks pageId={7} externalSharingEnabled={false} />);
    expect(screen.getByText("Link sharing is disabled for this page.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create link/i })).toBeNull();
  });
});

describe("PageShareLinks — enabled state", () => {
  function renderEnabled() {
    return render(<PageShareLinks pageId={7} externalSharingEnabled={true} />);
  }

  it("renders the create form when external sharing is enabled", () => {
    renderEnabled();
    expect(screen.getByRole("button", { name: /create link/i })).toBeInTheDocument();
  });

  it("renders the existing link rows", () => {
    renderEnabled();
    expect(screen.getByText(/expires 2027-01-01/i)).toBeInTheDocument();
  });

  it("calls createLink mutation with the form values on submit", async () => {
    const user = userEvent.setup();
    renderEnabled();

    const dateInput = screen.getByLabelText(/expires/i);
    await user.type(dateInput, "2027-06-01");
    await user.click(screen.getByRole("button", { name: /create link/i }));

    await waitFor(() => expect(createLinkMutate).toHaveBeenCalledTimes(1));
    expect(createLinkMutate.mock.calls[0]?.[0]).toMatchObject({ pageId: 7 });
  });

  it("reveals the token once after create so the user can copy the URL", async () => {
    const user = userEvent.setup();
    renderEnabled();

    const dateInput = screen.getByLabelText(/expires/i);
    await user.type(dateInput, "2027-06-01");
    await user.click(screen.getByRole("button", { name: /create link/i }));

    await waitFor(() => expect(createLinkMutate).toHaveBeenCalled());
    await act(() => {
      createLinkMutate.mock.calls[0]?.[1].onSuccess({
        id: 99,
        pageId: 7,
        access: "view",
        allowDownload: false,
        expiresAt: "2027-06-01T00:00:00Z",
        createdAt: "2026-10-21T00:00:00Z",
        revokedAt: null,
        lastAccessedAt: null,
        isExpired: false,
        isRevoked: false,
        token: "tok-secret",
      });
    });

    expect(screen.getByText(/tok-secret/i)).toBeInTheDocument();
  });

  it("shows the revoke button so the user can revoke an existing link", () => {
    renderEnabled();
    expect(screen.getByRole("button", { name: /revoke/i })).toBeInTheDocument();
  });
});
