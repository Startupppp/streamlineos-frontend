import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PageSharePopover from "./page-share-popover";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";

const setVisibilityMutate = jest.fn();

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

    expect(screen.getByRole("button", { name: "Share page" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /manage access/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /^private$/i })).toBeNull();
  });

  it("exposes Manage access and the three visibility options once the Share trigger is opened, proving the permission controls the toolbar gates on kb:pages:update are exactly these", async () => {
    const user = userEvent.setup();
    renderPopover();

    await user.click(screen.getByRole("button", { name: "Share page" }));

    expect(screen.getByText("Manage access")).toBeInTheDocument();
    expect(screen.getByText("Private")).toBeInTheDocument();
    expect(screen.getByText("Team")).toBeInTheDocument();
    expect(screen.getByText("Public")).toBeInTheDocument();
  });

  it("opens the page grants sheet from Manage access, so Manage access is the entry point to the per-page permission editor", async () => {
    const user = userEvent.setup();
    renderPopover();

    await user.click(screen.getByRole("button", { name: "Share page" }));
    expect(screen.queryByTestId("page-grants-sheet")).toBeNull();

    await user.click(screen.getByText("Manage access"));

    expect(screen.getByTestId("page-grants-sheet")).toBeInTheDocument();
  });

  it("changes visibility through the mutation when a different option is chosen", async () => {
    const user = userEvent.setup();
    renderPopover();

    await user.click(screen.getByRole("button", { name: "Share page" }));
    await user.click(screen.getByText("Public"));

    expect(setVisibilityMutate).toHaveBeenCalledTimes(1);
    expect(setVisibilityMutate.mock.calls[0]?.[0]).toEqual({
      pageId: 5,
      visibility: "public",
    });
  });

  it("does not re-issue the visibility mutation when the already-current option is chosen", async () => {
    const user = userEvent.setup();
    renderPopover({ visibility: "org" });

    await user.click(screen.getByRole("button", { name: "Share page" }));
    await user.click(screen.getByText("Team"));

    expect(setVisibilityMutate).not.toHaveBeenCalled();
  });
});

describe("PageSharePopover — the public link appears only once the page is public and has a token", () => {
  it("offers no public link row for an org-visibility page", async () => {
    const user = userEvent.setup();
    renderPopover({ visibility: "org", publicToken: "tok-abc" });

    await user.click(screen.getByRole("button", { name: "Share page" }));

    expect(screen.queryByRole("button", { name: "Copy link" })).toBeNull();
  });

  it("offers no public link row for a public page that has no token yet", async () => {
    const user = userEvent.setup();
    renderPopover({ visibility: "public", publicToken: null });

    await user.click(screen.getByRole("button", { name: "Share page" }));

    expect(screen.queryByRole("button", { name: "Copy link" })).toBeNull();
  });

  it("offers the public link row for a public page with a token, so the two absences above are conditions and not a missing control", async () => {
    const user = userEvent.setup();
    renderPopover({ visibility: "public", publicToken: "tok-abc" });

    await user.click(screen.getByRole("button", { name: "Share page" }));

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

    await user.click(screen.getByRole("button", { name: "Share page" }));
    await user.click(screen.getByRole("button", { name: "Copy link" }));

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/wiki/tok-abc`);
  });
});
