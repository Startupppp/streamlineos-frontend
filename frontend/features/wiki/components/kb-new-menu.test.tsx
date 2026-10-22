import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { KbNewMenu } from "./kb-new-menu";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/knowledge/wiki",
}));

const mockUploadMutate = jest.fn();
jest.mock("@/hooks/api/kb/files", () => ({
  useUploadKbFile: () => ({
    mutate: mockUploadMutate,
    isPending: false,
  }),
}));

const mockMutate = jest.fn();
jest.mock("@/hooks/api/kb", () => ({
  useCreateKbPage: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

const mockCanImpl = jest.fn<boolean, [string]>(() => true);
jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockCanImpl(key),
}));

const mockReadSpreadsheetFile = jest.fn<
  Promise<{ title: string; workbook: Record<string, unknown> }>,
  [File]
>();
jest.mock("@/features/wiki/lib/kb-spreadsheet-file", () => ({
  KB_SPREADSHEET_ACCEPT: ".xlsx,.xls,.csv",
  readSpreadsheetFile: (file: File) => mockReadSpreadsheetFile(file),
}));

jest.mock("./space-sheet", () => ({
  SpaceSheet: ({ open }: { open: boolean }) =>
    open ? <div data-testid="space-sheet" /> : null,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [k: string]: unknown;
  }) => <a href={href} {...rest}>{children}</a>,
}));

const EMPTY_SCOPE = {};

beforeEach(() => {
  jest.clearAllMocks();
  mockCanImpl.mockReturnValue(true);
  mockMutate.mockImplementation((_input, { onSuccess, onSettled }) => {
    onSuccess?.({ id: 42, projectId: null } as never);
    onSettled?.();
  });
});

describe("KbNewMenu — gating", () => {
  it("renders null when the actor cannot create pages", () => {
    mockCanImpl.mockReturnValue(false);
    const { container } = render(<KbNewMenu scope={EMPTY_SCOPE} allowFolder={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the trigger when the actor can create pages", () => {
    render(<KbNewMenu scope={EMPTY_SCOPE} allowFolder={false} />);
    expect(screen.getByRole("button", { name: /New/i })).toBeInTheDocument();
  });
});

describe("KbNewMenu — menu items", () => {
  it("shows Document item and calls create with kind document", async () => {
    render(<KbNewMenu scope={{ spaceId: 3 }} allowFolder={false} />);
    await userEvent.click(screen.getByRole("button", { name: /New/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /Document/ }));
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 3, kind: "document" }),
      expect.any(Object),
    );
  });

  it("shows Spreadsheet item and calls create with kind spreadsheet", async () => {
    render(<KbNewMenu scope={{ spaceId: 3 }} allowFolder={false} />);
    await userEvent.click(screen.getByRole("button", { name: /New/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /Spreadsheet/ }));
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 3, kind: "spreadsheet" }),
      expect.any(Object),
    );
  });

  it("hides Folder item when allowFolder is false", async () => {
    render(<KbNewMenu scope={EMPTY_SCOPE} allowFolder={false} />);
    await userEvent.click(screen.getByRole("button", { name: /New/i }));
    expect(screen.queryByRole("menuitem", { name: /Folder/ })).not.toBeInTheDocument();
  });

  it("shows Folder item when allowFolder and canManageSpaces", async () => {
    render(<KbNewMenu scope={EMPTY_SCOPE} allowFolder={true} />);
    await userEvent.click(screen.getByRole("button", { name: /New/i }));
    expect(screen.getByRole("menuitem", { name: /Folder/ })).toBeInTheDocument();
  });

  it("hides Folder item when allowFolder but not canManageSpaces", async () => {
    mockCanImpl.mockImplementation((key) => key !== "kb:spaces:manage");
    render(<KbNewMenu scope={EMPTY_SCOPE} allowFolder={true} />);
    await userEvent.click(screen.getByRole("button", { name: /New/i }));
    expect(screen.queryByRole("menuitem", { name: /Folder/ })).not.toBeInTheDocument();
  });

  it("hides Import documents when canImport is false", async () => {
    mockCanImpl.mockImplementation((key) => key !== "kb:pages:import");
    render(<KbNewMenu scope={EMPTY_SCOPE} allowFolder={false} />);
    await userEvent.click(screen.getByRole("button", { name: /New/i }));
    expect(screen.queryByRole("menuitem", { name: /Import documents/ })).not.toBeInTheDocument();
  });

  it("shows Import documents when canImport is true", async () => {
    render(<KbNewMenu scope={EMPTY_SCOPE} allowFolder={false} />);
    await userEvent.click(screen.getByRole("button", { name: /New/i }));
    expect(screen.getByRole("menuitem", { name: /Import documents/ })).toBeInTheDocument();
  });

  it("always shows From template", async () => {
    render(<KbNewMenu scope={EMPTY_SCOPE} allowFolder={false} />);
    await userEvent.click(screen.getByRole("button", { name: /New/i }));
    expect(screen.getByRole("menuitem", { name: /From template/ })).toBeInTheDocument();
  });
});

describe("KbNewMenu — upload path", () => {
  it("calls create with spreadsheet kind and parsed title/workbook on success", async () => {
    mockReadSpreadsheetFile.mockResolvedValue({
      title: "Budget",
      workbook: { sheets: [{ name: "Sheet1" }] },
    });

    render(<KbNewMenu scope={{ spaceId: 5 }} allowFolder={false} />);
    await userEvent.click(screen.getByRole("button", { name: /New/i }));

    const uploadItem = screen.getByRole("menuitem", { name: /Upload Excel/ });
    fireEvent.click(uploadItem);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["content"], "budget.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    Object.defineProperty(fileInput, "files", { value: [file] });
    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          spaceId: 5,
          kind: "spreadsheet",
          title: "Budget",
          workbook: { sheets: [{ name: "Sheet1" }] },
        }),
        expect.any(Object),
      );
    });
  });

  it("shows a toast error when readSpreadsheetFile throws", async () => {
    mockReadSpreadsheetFile.mockRejectedValue(
      new Error("File is corrupt or unsupported"),
    );

    render(<KbNewMenu scope={EMPTY_SCOPE} allowFolder={false} />);
    await userEvent.click(screen.getByRole("button", { name: /New/i }));

    const uploadItem = screen.getByRole("menuitem", { name: /Upload Excel/ });
    fireEvent.click(uploadItem);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["bad"], "bad.csv", { type: "text/csv" });
    Object.defineProperty(fileInput, "files", { value: [file] });
    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(mockMutate).not.toHaveBeenCalled();
    });
  });
});

describe("KbNewMenu — navigation", () => {
  it("navigates to pageHref after creating a non-project page", async () => {
    render(<KbNewMenu scope={{ spaceId: 1 }} allowFolder={false} />);
    await userEvent.click(screen.getByRole("button", { name: /New/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /Document/ }));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("/knowledge/wiki/doc/42"),
      );
    });
  });

  it("navigates to projectPageHref when projectId is set", async () => {
    render(<KbNewMenu scope={{ projectId: 7 }} allowFolder={false} />);
    await userEvent.click(screen.getByRole("button", { name: /New/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /Document/ }));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("/build/7/wiki/42"),
      );
    });
  });

  it("calls onCreated after navigation", async () => {
    const onCreated = jest.fn();
    render(
      <KbNewMenu scope={{ spaceId: 2 }} allowFolder={false} onCreated={onCreated} />,
    );
    await userEvent.click(screen.getByRole("button", { name: /New/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /Document/ }));
    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledTimes(1);
    });
  });
});

describe("KbNewMenu — custom trigger", () => {
  it("uses the provided trigger element", () => {
    render(
      <KbNewMenu
        scope={EMPTY_SCOPE}
        allowFolder={false}
        trigger={<button type="button">Custom trigger</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Custom trigger" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^New$/i })).not.toBeInTheDocument();
  });
});

describe("KbNewMenu — Folder", () => {
  it("opens SpaceSheet when Folder is selected", async () => {
    render(<KbNewMenu scope={EMPTY_SCOPE} allowFolder={true} />);
    await userEvent.click(screen.getByRole("button", { name: /New/i }));
    await userEvent.click(screen.getByRole("menuitem", { name: /Folder/ }));
    expect(screen.getByTestId("space-sheet")).toBeInTheDocument();
  });
});
