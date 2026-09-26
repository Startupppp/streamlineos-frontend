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
  default: () => <button type="button" aria-label="Share page" />,
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

function renderToolbar(overrides: Partial<KbPageDetail> = {}) {
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
});
