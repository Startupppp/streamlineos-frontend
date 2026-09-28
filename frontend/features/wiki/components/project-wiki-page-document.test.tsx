import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

async function pressQuestionMarkOn(target: EventTarget) {
  await act(async () => {
    target.dispatchEvent(
      new KeyboardEvent("keydown", { key: "?", bubbles: true, cancelable: true }),
    );
  });
}

function queryShortcutHelp() {
  return screen.queryByRole("heading", { name: /keyboard shortcuts/i });
}

describe("ProjectWikiPageDocument — ? shortcut opens the shortcut help dialog (task K)", () => {
  it("the shortcut help dialog is absent before the ? key is pressed, so the opening assertion below is not vacuous", () => {
    render(<ProjectWikiPageDocument projectId={7} pageId={42} />);

    expect(queryShortcutHelp()).not.toBeInTheDocument();
  });

  it("pressing ? on the page body opens the real ShortcutHelpDialog with its keyboard shortcuts table", async () => {
    render(<ProjectWikiPageDocument projectId={7} pageId={42} />);

    await pressQuestionMarkOn(document);

    expect(queryShortcutHelp()).toBeInTheDocument();
    expect(screen.getByText("Show keyboard shortcuts")).toBeInTheDocument();
  });

  it("pressing Escape closes the shortcut help dialog that ? opened", async () => {
    const user = userEvent.setup();
    render(<ProjectWikiPageDocument projectId={7} pageId={42} />);

    await pressQuestionMarkOn(document);
    expect(queryShortcutHelp()).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => expect(queryShortcutHelp()).not.toBeInTheDocument());
  });

  it("pressing ? inside a text input does not open the dialog, so a question mark typed into a field reaches the field", async () => {
    render(
      <>
        <input aria-label="A text field" />
        <ProjectWikiPageDocument projectId={7} pageId={42} />
      </>,
    );

    const input = screen.getByRole("textbox", { name: "A text field" });
    input.focus();
    await pressQuestionMarkOn(input);

    expect(queryShortcutHelp()).not.toBeInTheDocument();
  });

  it("pressing ? inside a textarea does not open the dialog", async () => {
    render(
      <>
        <textarea aria-label="A multiline field" />
        <ProjectWikiPageDocument projectId={7} pageId={42} />
      </>,
    );

    const textarea = screen.getByRole("textbox", { name: "A multiline field" });
    textarea.focus();
    await pressQuestionMarkOn(textarea);

    expect(queryShortcutHelp()).not.toBeInTheDocument();
  });

  it("pressing ? on a descendant of the contenteditable page editor does not open the dialog, so a question mark typed into a document body reaches the document", async () => {
    render(
      <>
        <div contentEditable suppressContentEditableWarning data-testid="page-editor">
          <span data-testid="editor-leaf">paragraph text</span>
        </div>
        <ProjectWikiPageDocument projectId={7} pageId={42} />
      </>,
    );

    const leaf = screen.getByTestId("editor-leaf");
    await pressQuestionMarkOn(leaf);

    expect(queryShortcutHelp()).not.toBeInTheDocument();
  });

  it("pressing ? on an element outside the editor still opens the dialog, so the editor guard is scoped and not a blanket suppression", async () => {
    render(
      <>
        <div contentEditable suppressContentEditableWarning data-testid="page-editor">
          <span data-testid="editor-leaf">paragraph text</span>
        </div>
        <ProjectWikiPageDocument projectId={7} pageId={42} />
      </>,
    );

    await pressQuestionMarkOn(screen.getByTestId("page-document"));

    expect(queryShortcutHelp()).toBeInTheDocument();
  });

  it("pressing ? with a modifier held does not open the dialog, so browser and command palette chords are not intercepted", async () => {
    render(<ProjectWikiPageDocument projectId={7} pageId={42} />);

    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "?",
          metaKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    expect(queryShortcutHelp()).not.toBeInTheDocument();
  });
});
