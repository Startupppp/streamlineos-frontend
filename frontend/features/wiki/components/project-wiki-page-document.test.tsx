import { act, render, screen } from "@testing-library/react";
import ProjectWikiPageDocument from "./project-wiki-page-document";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/build/7/wiki/42",
}));

jest.mock("./page-document", () => ({
  __esModule: true,
  default: jest.fn(
    (props: { pageId: number; projectId?: number; onNavigateToPage?: unknown }) => (
      <div
        data-testid="page-document"
        data-page-id={props.pageId}
        data-project-id={props.projectId ?? "none"}
      />
    ),
  ),
}));

jest.mock("./page-tree", () => ({
  __esModule: true,
  default: jest.fn(
    (props: { projectId?: number; baseHref?: string }) => (
      <div
        data-testid="page-tree"
        data-project-id={String(props.projectId ?? "")}
        data-base-href={props.baseHref ?? ""}
      />
    ),
  ),
}));

jest.mock("@/features/build/shared/shortcut-help-dialog", () => ({
  ShortcutHelpDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="shortcut-help-dialog" /> : null,
}));

describe("ProjectWikiPageDocument — renders and propagates props", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("renders the page document component with the correct pageId", () => {
    render(<ProjectWikiPageDocument projectId={7} pageId={42} />);

    expect(screen.getByTestId("page-document")).toHaveAttribute("data-page-id", "42");
  });

  it("passes projectId through to PageDocument for breadcrumb context", () => {
    render(<ProjectWikiPageDocument projectId={7} pageId={42} />);

    expect(screen.getByTestId("page-document")).toHaveAttribute("data-project-id", "7");
  });

  it("shows Wiki back link pointing at the project wiki", () => {
    render(<ProjectWikiPageDocument projectId={7} pageId={42} />);

    const wikiLink = screen.getByRole("link", { name: /wiki/i });
    expect(wikiLink).toHaveAttribute("href", "/build/7/wiki");
  });
});

describe("ProjectWikiPageDocument — page tree mounts with project-scoped baseHref (task J)", () => {
  it("mounts the page tree with the project-scoped baseHref so page links stay within the project wiki not the knowledge base", () => {
    render(<ProjectWikiPageDocument projectId={7} pageId={42} />);

    expect(screen.getByTestId("page-tree")).toHaveAttribute("data-base-href", "/build/7/wiki");
  });

  it("passes the correct projectId to the page tree so it loads only that project's pages", () => {
    render(<ProjectWikiPageDocument projectId={7} pageId={42} />);

    expect(screen.getByTestId("page-tree")).toHaveAttribute("data-project-id", "7");
  });
});

describe("ProjectWikiPageDocument — ? shortcut opens the shortcut help dialog (task K)", () => {
  it("ShortcutHelpDialog is hidden before the ? key is pressed — paired negative control", () => {
    render(<ProjectWikiPageDocument projectId={7} pageId={42} />);

    expect(screen.queryByTestId("shortcut-help-dialog")).not.toBeInTheDocument();
  });

  it("pressing ? on the document opens the ShortcutHelpDialog", async () => {
    render(<ProjectWikiPageDocument projectId={7} pageId={42} />);

    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "?", bubbles: true, cancelable: true }),
      );
    });

    expect(screen.getByTestId("shortcut-help-dialog")).toBeInTheDocument();
  });

  it("pressing ? while focused on an input does not open the dialog so the shortcut does not interfere with typing", async () => {
    const { container } = render(
      <>
        <input data-testid="text-input" />
        <ProjectWikiPageDocument projectId={7} pageId={42} />
      </>,
    );

    const input = container.querySelector("input[data-testid='text-input']") as HTMLInputElement;
    input.focus();

    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "?", bubbles: true, cancelable: true }),
      );
    });

    expect(screen.queryByTestId("shortcut-help-dialog")).not.toBeInTheDocument();
  });
});
