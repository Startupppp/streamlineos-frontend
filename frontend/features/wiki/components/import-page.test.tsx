import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ImportPage from "./import-page";

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  usePermissionGate: (permission: string) => ({
    permission,
    allowed: true,
    denied: false,
    pending: false,
  }),
}));

jest.mock("@/hooks/api/kb", () => ({
  useKbPagesTree: () => ({ data: [] }),
  useImportKbPages: () => ({ mutate: jest.fn(), isPending: false }),
  useKbImportJobs: () => ({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  }),
  useKbExportJobs: () => ({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  }),
}));

describe("ImportPage — Import / Export tabs", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockSearchParams = new URLSearchParams();
  });

  it("shows Import tab chrome with Choose files and Paste text, not Export list", () => {
    render(<ImportPage />);

    expect(screen.getByRole("tab", { name: /^import$/i })).toHaveAttribute(
      "data-state",
      "active",
    );
    expect(screen.getByRole("button", { name: /choose files/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /paste text/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /recent imports/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^exports$/i })).toBeNull();
    expect(screen.getByText("0/100 files loaded")).toBeInTheDocument();
  });

  it("switches to Export tab via the URL", () => {
    mockSearchParams = new URLSearchParams("tab=export");
    render(<ImportPage />);

    expect(screen.getByRole("tab", { name: /^export$/i })).toHaveAttribute(
      "data-state",
      "active",
    );
    expect(screen.getByText("No exports yet")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^exports$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /choose files/i })).toBeNull();
    expect(screen.queryByRole("heading", { name: /recent imports/i })).toBeNull();
  });

  it("opens paste from the header button on the Import tab", async () => {
    const user = userEvent.setup();
    render(<ImportPage />);

    await user.click(screen.getByRole("button", { name: /paste text/i }));

    expect(screen.getByLabelText("Page title")).toBeInTheDocument();
  });

  it("writes tab=export into the URL when Export is selected", async () => {
    const user = userEvent.setup();
    render(<ImportPage />);

    await user.click(screen.getByRole("tab", { name: /^export$/i }));

    expect(mockReplace).toHaveBeenCalledWith(
      "/knowledge/wiki/import?tab=export",
      { scroll: false },
    );
  });
});
