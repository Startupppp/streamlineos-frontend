import { render, screen } from "@testing-library/react";
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
