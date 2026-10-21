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

jest.mock("./page-grants-sheet", () => ({
  __esModule: true,
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="page-grants-sheet" /> : null,
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

  it("exposes Manage access and the three visibility options once the Share trigger is opened, proving the permission controls the toolbar gates on kb:pages:update are exactly these", async () => {
    const user = userEvent.setup();
    renderPopover();

    await user.click(screen.getByRole("button", { name: "Share file" }));

    expect(screen.getByText("Manage access")).toBeInTheDocument();
    expect(screen.getByText("Private")).toBeInTheDocument();
    expect(screen.getByText("Team")).toBeInTheDocument();
    expect(screen.getByText("Public")).toBeInTheDocument();
  });

  it("opens the page grants sheet from Manage access, so Manage access is the entry point to the per-page permission editor", async () => {
    const user = userEvent.setup();
    renderPopover();

    await user.click(screen.getByRole("button", { name: "Share file" }));
    expect(screen.queryByTestId("page-grants-sheet")).toBeNull();

    await user.click(screen.getByText("Manage access"));

    expect(screen.getByTestId("page-grants-sheet")).toBeInTheDocument();
  });

  it("changes visibility through the mutation when a different option is chosen", async () => {
    const user = userEvent.setup();
    renderPopover();

    await user.click(screen.getByRole("button", { name: "Share file" }));
    await user.click(screen.getByText("Public"));

    expect(setVisibilityMutate).toHaveBeenCalledTimes(1);
    expect(setVisibilityMutate.mock.calls[0]?.[0]).toEqual({
      pageId: 5,
      visibility: "public",
      expectedContentRevision: 7,
    });
  });

  it("reports a stale visibility conflict without retrying against another revision", async () => {
    const user = userEvent.setup();
    renderPopover();

    await user.click(screen.getByRole("button", { name: "Share file" }));
    await user.click(screen.getByText("Public"));
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

describe("PageSharePopover — the public link appears only once the page is public and has a token", () => {
  it("offers no public link row for an org-visibility page", async () => {
    const user = userEvent.setup();
    renderPopover({ visibility: "org", publicToken: "tok-abc" });

    await user.click(screen.getByRole("button", { name: "Share file" }));

    expect(screen.queryByRole("button", { name: "Copy link" })).toBeNull();
  });

  it("offers no public link row for a public page that has no token yet", async () => {
    const user = userEvent.setup();
    renderPopover({ visibility: "public", publicToken: null });

    await user.click(screen.getByRole("button", { name: "Share file" }));

    expect(screen.queryByRole("button", { name: "Copy link" })).toBeNull();
  });

  it("offers the public link row for a public page with a token, so the two absences above are conditions and not a missing control", async () => {
    const user = userEvent.setup();
    renderPopover({ visibility: "public", publicToken: "tok-abc" });

    await user.click(screen.getByRole("button", { name: "Share file" }));

    expect(screen.getByRole("button", { name: "Copy link" })).toBeInTheDocument();
  });

  it("copies the public wiki URL rather than the current authenticated page URL", async () => {
    const user = userEvent.setup();
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    renderPopover({ visibility: "public", publicToken: "tok-abc" });

    await user.click(screen.getByRole("button", { name: "Share file" }));
    await user.click(screen.getByRole("button", { name: "Copy link" }));

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/wiki/tok-abc`);
  });
});

describe("PageSharePopover — the options say which visibility is current", () => {
  it("marks only the page's visibility as checked and makes it the focus target, so a Public page never reads as Private", async () => {
    const user = userEvent.setup();
    renderPopover({ visibility: "public", publicToken: "tok-abc" });

    await user.click(screen.getByRole("button", { name: "Share file" }));

    expect(screen.getByRole("radio", { name: /public/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /public/i })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: /private/i })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: /private/i })).toHaveAttribute("tabindex", "-1");
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

describe("PageSharePopover — a public draft says its link is not live yet", () => {
  it("tells the author the public link works only after publishing, because the public route serves published pages only", async () => {
    const user = userEvent.setup();
    renderPopover({ visibility: "public", publicToken: "tok-abc", status: "draft" });

    await user.click(screen.getByRole("button", { name: "Share file" }));

    expect(screen.getByText("The public link works once this file is published.")).toBeInTheDocument();
  });

  it("shows no such hint for a published public page", async () => {
    const user = userEvent.setup();
    renderPopover({ visibility: "public", publicToken: "tok-abc", status: "published" });

    await user.click(screen.getByRole("button", { name: "Share file" }));

    expect(screen.queryByText("The public link works once this file is published.")).toBeNull();
  });
});
