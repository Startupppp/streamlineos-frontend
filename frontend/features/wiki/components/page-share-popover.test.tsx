import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PageSharePopover from "./page-share-popover";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";
import { ApiError } from "@/lib/api-envelope";
import { toast } from "sonner";

const setVisibilityMutate = jest.fn();

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@/hooks/api/kb/pages", () => ({
  useSetKbPageVisibility: () => ({
    mutate: setVisibilityMutate,
    isPending: false,
  }),
}));

jest.mock("@/hooks/api/kb/sharing", () => ({
  useKbSharingSettings: () => ({ data: { externalSharing: "guests_and_links" } }),
  useKbSpaceSharingPolicy: () => ({ data: undefined }),
  useKbPageShareLinks: () => ({
    data: [],
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  }),
  useCreateKbShareLink: () => ({ mutate: jest.fn(), isPending: false }),
  useRevokeKbShareLink: () => ({ mutate: jest.fn(), isPending: false }),
  useRotateKbShareLink: () => ({ mutate: jest.fn(), isPending: false }),
  useCreateKbGuestGrant: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("./page-grants-sheet", () => ({
  __esModule: true,
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="page-grants-sheet" /> : null,
}));

jest.mock("./sharing/page-share-guests", () => ({
  PageShareGuests: ({ externalSharingEnabled }: { externalSharingEnabled: boolean }) => (
    <div data-testid="page-share-guests" data-enabled={String(externalSharingEnabled)} />
  ),
}));

jest.mock("./sharing/page-share-links", () => ({
  PageShareLinks: ({ externalSharingEnabled }: { externalSharingEnabled: boolean }) => (
    <div data-testid="page-share-links" data-enabled={String(externalSharingEnabled)} />
  ),
}));

const page = {
  id: 5,
  title: "Deployment runbook",
  isFavorite: false,
  isLocked: false,
  coverImage: null,
  visibility: "org",
  publicToken: null,
  contentRevision: 7,
  status: "published",
  spaceId: 10,
  can: { view: true, comment: true, edit: true, manage: true, restore: true },
} as KbPageDetail;

function renderPopover(overrides: Partial<KbPageDetail> = {}) {
  return render(<PageSharePopover page={{ ...page, ...overrides }} />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PageSharePopover — the privileged share controls live behind the Share trigger", () => {
  it("keeps the visibility options and Manage access out of the document until the Share trigger is opened, so the absence assertions in the toolbar gate tests are about the gate and not about a control that never renders", () => {
    renderPopover();

    expect(screen.getByRole("button", { name: "Share file" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /manage access/i })).toBeNull();
    expect(screen.queryByRole("radio", { name: /private/i })).toBeNull();
  });

  it("exposes Manage access and two visibility options (Private and Team) once the Share trigger is opened", async () => {
    const user = userEvent.setup();
    renderPopover();

    await user.click(screen.getByRole("button", { name: "Share file" }));

    expect(screen.getByText("Manage access")).toBeInTheDocument();
    expect(screen.getByText("Private")).toBeInTheDocument();
    expect(screen.getByText("Team")).toBeInTheDocument();
  });

  it("does not include a Public visibility option, because backend rejects public as an input", async () => {
    const user = userEvent.setup();
    renderPopover();

    await user.click(screen.getByRole("button", { name: "Share file" }));

    expect(screen.queryByText("Public")).toBeNull();
  });

  it("opens the page grants sheet from Manage access, so Manage access is the entry point to the per-page permission editor", async () => {
    const user = userEvent.setup();
    renderPopover();

    await user.click(screen.getByRole("button", { name: "Share file" }));
    expect(screen.queryByTestId("page-grants-sheet")).toBeNull();

    await user.click(screen.getByText("Manage access"));

    expect(screen.getByTestId("page-grants-sheet")).toBeInTheDocument();
  });

  it("changes visibility through the mutation when the other option is chosen", async () => {
    const user = userEvent.setup();
    renderPopover({ visibility: "org" });

    await user.click(screen.getByRole("button", { name: "Share file" }));
    await user.click(screen.getByText("Private"));

    expect(setVisibilityMutate).toHaveBeenCalledTimes(1);
    expect(setVisibilityMutate.mock.calls[0]?.[0]).toEqual({
      pageId: 5,
      visibility: "private",
      expectedContentRevision: 7,
    });
  });

  it("treats a legacy public visibility page as org (team) for the radio group", async () => {
    const user = userEvent.setup();
    renderPopover({ visibility: "public" });

    await user.click(screen.getByRole("button", { name: "Share file" }));

    expect(screen.getByRole("radio", { name: /team/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /private/i })).toHaveAttribute("aria-checked", "false");
  });

  it("reports a stale visibility conflict without retrying against another revision", async () => {
    const user = userEvent.setup();
    renderPopover({ visibility: "org" });

    await user.click(screen.getByRole("button", { name: "Share file" }));
    await user.click(screen.getByText("Private"));
    setVisibilityMutate.mock.calls[0]?.[1].onError(new ApiError("Stale", 409, "STALE_REVISION"));

    expect(toast.error).toHaveBeenCalledWith("File changed before visibility was saved. Refresh before trying again.");
    expect(setVisibilityMutate).toHaveBeenCalledTimes(1);
  });

  it("does not re-issue the visibility mutation when the already-current option is chosen", async () => {
    const user = userEvent.setup();
    renderPopover({ visibility: "org" });

    await user.click(screen.getByRole("button", { name: "Share file" }));
    await user.click(screen.getByText("Team"));

    expect(setVisibilityMutate).not.toHaveBeenCalled();
  });
});

describe("PageSharePopover — the options say which visibility is current", () => {
  it("marks only the page's visibility as checked and makes it the focus target", async () => {
    const user = userEvent.setup();
    renderPopover({ visibility: "private" });

    await user.click(screen.getByRole("button", { name: "Share file" }));

    expect(screen.getByRole("radio", { name: /private/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /private/i })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: /team/i })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: /team/i })).toHaveAttribute("tabindex", "-1");
  });

  it("moves between options with the arrow keys", async () => {
    const user = userEvent.setup();
    renderPopover({ visibility: "private" });

    await user.click(screen.getByRole("button", { name: "Share file" }));
    screen.getByRole("radio", { name: /private/i }).focus();
    await user.keyboard("{ArrowDown}");

    expect(screen.getByRole("radio", { name: /team/i })).toHaveFocus();
  });
});

describe("PageSharePopover — external sharing sections visible for managers", () => {
  it("shows guest and link sections when page.can.manage is true", async () => {
    const user = userEvent.setup();
    renderPopover({ can: { view: true, comment: true, edit: true, manage: true, restore: true } });

    await user.click(screen.getByRole("button", { name: "Share file" }));

    expect(screen.getByTestId("page-share-guests")).toBeInTheDocument();
    expect(screen.getByTestId("page-share-links")).toBeInTheDocument();
  });

  it("hides guest and link sections when page.can.manage is false", async () => {
    const user = userEvent.setup();
    renderPopover({ can: { view: true, comment: true, edit: true, manage: false, restore: true } });

    await user.click(screen.getByRole("button", { name: "Share file" }));

    expect(screen.queryByTestId("page-share-guests")).toBeNull();
    expect(screen.queryByTestId("page-share-links")).toBeNull();
  });
});
