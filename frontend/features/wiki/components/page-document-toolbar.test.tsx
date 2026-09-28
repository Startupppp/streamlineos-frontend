import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PageDocumentToolbar } from "./page-document-toolbar";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const mockUseCan = jest.fn<boolean, [string]>(() => true);
jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockUseCan(key),
}));

jest.mock("@/hooks/api/kb", () => ({
  useToggleFavoriteKbPage: () => ({ mutate: jest.fn() }),
  useDuplicateKbPage: () => ({ mutate: jest.fn() }),
  useLockKbPage: () => ({ mutate: jest.fn() }),
  useKbPageBacklinks: () => ({ data: [] }),
}));

jest.mock("./kb-page-ai-actions", () => ({
  KbPageAiActions: () => <button type="button" aria-label="AI" />,
}));

jest.mock("./page-share-popover", () => ({
  __esModule: true,
  default: () => (
    <>
      <button type="button" aria-label="Share page" />
      <button type="button">Manage access</button>
    </>
  ),
}));

jest.mock("@/hooks/api/kb/export-page", () => ({
  useExportKbPage: () => ({ mutate: jest.fn() }),
}));

const page = {
  id: 5,
  title: "signos",
  isFavorite: false,
  isLocked: false,
  coverImage: null,
} as KbPageDetail;

function noop() {}

function renderToolbar(overrides: Partial<KbPageDetail> = {}, onOpenLinkedRecords: () => void = noop) {
  return render(
    <PageDocumentToolbar
      page={{ ...page, ...overrides }}
      pageId={5}
      isEditable
      onOpenMetaSheet={noop}
      onOpenComments={noop}
      onOpenHistory={noop}
      onOpenMove={noop}
      onOpenSaveAsTemplate={noop}
      onOpenCover={noop}
      onDelete={noop}
      onNavigate={noop}
      onOpenLinkedRecords={onOpenLinkedRecords}
    />,
  );
}

beforeEach(() => {
  mockUseCan.mockReturnValue(true);
});

describe("PageDocumentToolbar", () => {
  it("renders AI, Share, and More as icon-only controls", () => {
    renderToolbar();

    expect(screen.getByRole("button", { name: "AI" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Share page" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More options" })).toBeInTheDocument();
  });

  it("shows the More options trigger", () => {
    renderToolbar({ coverImage: "gradient:ocean", isFavorite: true });

    expect(screen.getByRole("button", { name: "More options" })).toBeInTheDocument();
  });

  it("labels favorite as remove when the page is already favorited", async () => {
    const user = userEvent.setup();
    renderToolbar({ isFavorite: true });

    await user.click(screen.getByRole("button", { name: "More options" }));

    expect(
      screen.getByRole("menuitem", { name: /remove from favorites/i }),
    ).toBeInTheDocument();
  });

  it("labels lock as unlock when the page is already locked", async () => {
    const user = userEvent.setup();
    renderToolbar({ isLocked: true });

    await user.click(screen.getByRole("button", { name: "More options" }));

    expect(
      screen.getByRole("menuitem", { name: /unlock page/i }),
    ).toBeInTheDocument();
  });

  it("shows Export HTML when the user has kb:pages:export", async () => {
    const user = userEvent.setup();
    mockUseCan.mockImplementation((key: string) => key === "kb:pages:export");

    renderToolbar();
    await user.click(screen.getByRole("button", { name: "More options" }));

    expect(screen.getByRole("menuitem", { name: /export html/i })).toBeInTheDocument();
  });

  it("hides Export HTML when the user lacks kb:pages:export", async () => {
    const user = userEvent.setup();
    mockUseCan.mockImplementation((key: string) => key !== "kb:pages:export");

    renderToolbar();
    await user.click(screen.getByRole("button", { name: "More options" }));

    expect(screen.queryByRole("menuitem", { name: /export html/i })).toBeNull();
  });

  it("hides Move when the user lacks kb:pages:update", async () => {
    const user = userEvent.setup();
    mockUseCan.mockImplementation((key: string) => key !== "kb:pages:update");

    renderToolbar();
    await user.click(screen.getByRole("button", { name: "More options" }));

    expect(screen.queryByRole("menuitem", { name: /^move$/i })).toBeNull();
  });

  it("shows Move when the user has kb:pages:update", async () => {
    const user = userEvent.setup();
    mockUseCan.mockImplementation((key: string) => key === "kb:pages:update");

    renderToolbar();
    await user.click(screen.getByRole("button", { name: "More options" }));

    expect(screen.getByRole("menuitem", { name: /^move$/i })).toBeInTheDocument();
  });

  it("shows Linked records in the dropdown regardless of capability", async () => {
    const user = userEvent.setup();
    mockUseCan.mockReturnValue(false);

    renderToolbar();
    await user.click(screen.getByRole("button", { name: "More options" }));

    expect(screen.getByRole("menuitem", { name: /linked records/i })).toBeInTheDocument();
  });

  it("calls onOpenLinkedRecords when Linked records is selected", async () => {
    const user = userEvent.setup();
    const onOpenLinkedRecords = jest.fn();

    renderToolbar({}, onOpenLinkedRecords);
    await user.click(screen.getByRole("button", { name: "More options" }));
    await user.click(screen.getByRole("menuitem", { name: /linked records/i }));

    expect(onOpenLinkedRecords).toHaveBeenCalledTimes(1);
  });
});

describe("PageDocumentToolbar — copy link for read-only viewers (task L)", () => {
  it("shows the Share page button when the user has kb:pages:update", () => {
    mockUseCan.mockReturnValue(true);
    renderToolbar();

    expect(screen.getByRole("button", { name: /share page/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copy link/i })).not.toBeInTheDocument();
  });

  it("shows the Copy link button instead of Share page when the user lacks kb:pages:update so view-only users can share the URL", () => {
    mockUseCan.mockImplementation((key: string) => key !== "kb:pages:update");
    renderToolbar();

    expect(screen.getByRole("button", { name: /copy link/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /share page/i })).not.toBeInTheDocument();
  });

  it("copy link button writes window.location.href to the clipboard when clicked", async () => {
    const user = userEvent.setup();
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    mockUseCan.mockImplementation((key: string) => key !== "kb:pages:update");
    renderToolbar();

    await user.click(screen.getByRole("button", { name: /copy link/i }));

    expect(writeText).toHaveBeenCalledWith(window.location.href);
  });

  it("offers Copy link in the More options menu to a viewer who holds no page permission at all, so the context menu mirrors the visible command", async () => {
    const user = userEvent.setup();
    mockUseCan.mockReturnValue(false);
    renderToolbar();

    await user.click(screen.getByRole("button", { name: "More options" }));

    expect(screen.getByRole("menuitem", { name: /copy link/i })).toBeInTheDocument();
  });

  it("copies the page URL from the More options menu item as well as from the toolbar button", async () => {
    const user = userEvent.setup();
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    mockUseCan.mockReturnValue(false);
    renderToolbar();

    await user.click(screen.getByRole("button", { name: "More options" }));
    await user.click(screen.getByRole("menuitem", { name: /copy link/i }));

    expect(writeText).toHaveBeenCalledWith(window.location.href);
  });

  it("keeps Manage access and the share trigger unreachable for the same viewer who can reach Copy link, so the ungated copy affordance did not ungate the permission editor", async () => {
    const user = userEvent.setup();
    mockUseCan.mockImplementation((key: string) => key !== "kb:pages:update");
    renderToolbar();

    expect(screen.getByRole("button", { name: /copy link/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /share page/i })).toBeNull();
    expect(screen.queryByText("Manage access")).toBeNull();

    await user.click(screen.getByRole("button", { name: "More options" }));

    expect(screen.queryByText("Manage access")).toBeNull();
    expect(screen.queryByRole("menuitem", { name: /^move$/i })).toBeNull();
  });

  it("reaches Manage access and the share trigger for a viewer who does hold kb:pages:update, so the absence above is the gate and not a control that cannot render", () => {
    mockUseCan.mockImplementation((key: string) => key === "kb:pages:update");
    renderToolbar();

    expect(screen.getByRole("button", { name: /share page/i })).toBeInTheDocument();
    expect(screen.getByText("Manage access")).toBeInTheDocument();
  });

  it("renders Copy link and hides the share trigger while the access response has not arrived, because useCan reports false for every key until it resolves and the privileged control must fail closed", () => {
    mockUseCan.mockReturnValue(false);
    renderToolbar();

    expect(screen.getByRole("button", { name: /copy link/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /share page/i })).toBeNull();
    expect(screen.queryByText("Manage access")).toBeNull();
  });
});
