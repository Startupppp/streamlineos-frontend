import { fireEvent, render, screen } from "@testing-library/react";

const mockUseCan = jest.fn<boolean, [string]>();

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockUseCan(key),
}));

jest.mock("@animateicons/react/lucide", () => ({
  DownloadIcon: () => null,
}));

jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: ({
    children,
    icon: _icon,
    iconSize: _iconSize,
    iconClassName: _iconClassName,
    variant: _variant,
    size: _size,
    ...props
  }: {
    children?: React.ReactNode;
    icon?: unknown;
    iconSize?: number;
    iconClassName?: string;
    variant?: string;
    size?: string;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

jest.mock("./ticket-import-panel", () => ({
  TicketImportPanel: ({ projectId }: { projectId: number }) => (
    <div data-testid="import-panel">{projectId}</div>
  ),
}));

jest.mock("./ticket-export-panel", () => ({
  TicketExportPanel: ({ projectId }: { projectId: number }) => (
    <div data-testid="export-panel">{projectId}</div>
  ),
}));

import { TicketImportExportDialog } from "./ticket-import-export-dialog";

function allow(...granted: string[]) {
  mockUseCan.mockImplementation((key: string) => granted.includes(key));
}

function openDialog() {
  fireEvent.click(screen.getByRole("button", { name: /export/i }));
}

describe("TicketImportExportDialog discoverability is permission-gated", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders no entry point at all for a caller who may neither view nor create tickets", () => {
    allow();

    const { container } = render(<TicketImportExportDialog projectId={7} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the entry point for a caller who holds both keys (control for the negative above)", () => {
    allow("build:tickets:view", "build:tickets:create");

    render(<TicketImportExportDialog projectId={7} />);

    expect(screen.getByRole("button", { name: "Import / Export" })).toBeInTheDocument();
  });

  it("offers export only, and labels it so, when the caller may view but not create tickets", () => {
    allow("build:tickets:view");

    render(<TicketImportExportDialog projectId={7} />);

    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Import / Export" })).toBeNull();
  });

  it("gates the entry point on the exact keys the backend routes require", () => {
    allow("build:tickets:view", "build:tickets:create");

    render(<TicketImportExportDialog projectId={7} />);

    expect(mockUseCan.mock.calls.map((call) => call[0])).toEqual([
      "build:tickets:create",
      "build:tickets:view",
    ]);
  });
});

describe("TicketImportExportDialog surfaces the flows the caller is allowed to run", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("opens on both tabs and starts on import for a caller who may create tickets", () => {
    allow("build:tickets:view", "build:tickets:create");

    render(<TicketImportExportDialog projectId={7} />);
    openDialog();

    expect(screen.getByRole("tab", { name: "Import" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Export" })).toBeInTheDocument();
    expect(screen.getByTestId("import-panel")).toHaveTextContent("7");
  });

  it("shows no import tab and no import panel when the caller may only view", () => {
    allow("build:tickets:view");

    render(<TicketImportExportDialog projectId={7} />);
    openDialog();

    expect(screen.queryByRole("tab", { name: "Import" })).toBeNull();
    expect(screen.queryByTestId("import-panel")).toBeNull();
    expect(screen.getByTestId("export-panel")).toHaveTextContent("7");
  });

  it("shows no export tab when the caller may create but not view tickets", () => {
    allow("build:tickets:create");

    render(<TicketImportExportDialog projectId={7} />);
    fireEvent.click(screen.getByRole("button", { name: "Import / Export" }));

    expect(screen.queryByRole("tab", { name: "Export" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Import" })).toBeInTheDocument();
  });
});
