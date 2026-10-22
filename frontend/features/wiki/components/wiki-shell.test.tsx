import { render, screen, fireEvent } from "@testing-library/react";
import WikiShell from "./wiki-shell";

const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockSearchParams = new URLSearchParams();
const mockMutate = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}));

jest.mock("@/hooks/api/kb/pages", () => ({
  useCreateKbPage: () => ({ mutate: mockMutate, isPending: false }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/components/layout/shell-sidebar-collapse-context", () => ({
  useShellSidebarCollapse: () => ({ isCollapsed: false }),
}));

jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("./page-tree", () => ({
  __esModule: true,
  default: () => <div>Folder tree</div>,
}));

jest.mock("./quick-find-dialog", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("./wiki-sidebar-nav", () => ({
  __esModule: true,
  default: () => <div>Wiki navigation</div>,
}));

jest.mock("./wiki-sidebar-chrome", () => ({
  WikiCollapsedSidebarChrome: () => null,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParams = new URLSearchParams();
});

it("renders one focused navigation rail without duplicating the home Favorites collection", () => {
  render(<WikiShell><div>Wiki body</div></WikiShell>);

  expect(screen.getByText("Wiki navigation")).toBeInTheDocument();
  expect(screen.getByText("Folder tree")).toBeInTheDocument();
  expect(screen.getByText("Wiki body")).toBeInTheDocument();
  expect(screen.queryByText("Favorites")).not.toBeInTheDocument();
});

describe("WikiShell — ?create=1 confirmation guard", () => {
  it("does not call createPage.mutate immediately when ?create=1 is present", () => {
    mockSearchParams = new URLSearchParams("create=1");
    render(<WikiShell><div>body</div></WikiShell>);
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("shows the confirmation dialog when ?create=1 is in the URL", () => {
    mockSearchParams = new URLSearchParams("create=1");
    render(<WikiShell><div>body</div></WikiShell>);
    expect(screen.getByText("Create a new document?")).toBeInTheDocument();
  });

  it("strips ?create=1 from the URL when the confirm dialog is shown", () => {
    mockSearchParams = new URLSearchParams("create=1");
    render(<WikiShell><div>body</div></WikiShell>);
    expect(mockReplace).toHaveBeenCalledWith(
      expect.not.stringContaining("create=1"),
    );
  });

  it("calls createPage.mutate when the user confirms", () => {
    mockSearchParams = new URLSearchParams("create=1");
    render(<WikiShell><div>body</div></WikiShell>);
    const confirmButton = screen.getByRole("button", { name: /create/i });
    fireEvent.click(confirmButton);
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it("does not call createPage.mutate when the user cancels", () => {
    mockSearchParams = new URLSearchParams("create=1");
    render(<WikiShell><div>body</div></WikiShell>);
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("does not show a confirmation dialog when ?create=1 is absent", () => {
    render(<WikiShell><div>body</div></WikiShell>);
    expect(screen.queryByText("Create a new document?")).not.toBeInTheDocument();
  });

  it("calls createPage.mutate with kind: document when ?create=1 is confirmed", () => {
    mockSearchParams = new URLSearchParams("create=1");
    render(<WikiShell><div>body</div></WikiShell>);
    const confirmButton = screen.getByRole("button", { name: /create/i });
    fireEvent.click(confirmButton);
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "document" }),
      expect.anything(),
    );
  });
});

describe("WikiShell — ?create=spreadsheet confirmation guard", () => {
  it("does not call createPage.mutate immediately when ?create=spreadsheet is present", () => {
    mockSearchParams = new URLSearchParams("create=spreadsheet");
    render(<WikiShell><div>body</div></WikiShell>);
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("shows the spreadsheet confirmation dialog when ?create=spreadsheet is in the URL", () => {
    mockSearchParams = new URLSearchParams("create=spreadsheet");
    render(<WikiShell><div>body</div></WikiShell>);
    expect(screen.getByText("Create a new spreadsheet?")).toBeInTheDocument();
  });

  it("strips ?create=spreadsheet from the URL when the confirm dialog is shown", () => {
    mockSearchParams = new URLSearchParams("create=spreadsheet");
    render(<WikiShell><div>body</div></WikiShell>);
    expect(mockReplace).toHaveBeenCalledWith(
      expect.not.stringContaining("create=spreadsheet"),
    );
  });

  it("calls createPage.mutate with kind: spreadsheet when confirmed", () => {
    mockSearchParams = new URLSearchParams("create=spreadsheet");
    render(<WikiShell><div>body</div></WikiShell>);
    const confirmButton = screen.getByRole("button", { name: /create/i });
    fireEvent.click(confirmButton);
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "spreadsheet" }),
      expect.anything(),
    );
  });

  it("does not show the spreadsheet dialog when ?create=spreadsheet is absent", () => {
    render(<WikiShell><div>body</div></WikiShell>);
    expect(screen.queryByText("Create a new spreadsheet?")).not.toBeInTheDocument();
  });
});
