import { render, screen } from "@testing-library/react";
import ImportPage from "./import-page";

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();
let grantedPermissions: string[] = [];

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (permission: string) => grantedPermissions.includes(permission),
  usePermissionGate: (permission: string) => ({
    permission,
    allowed: grantedPermissions.includes(permission),
    denied: !grantedPermissions.includes(permission),
    pending: false,
  }),
}));

jest.mock("@/hooks/api/kb/spaces", () => ({
  useKbSpaces: () => ({
    data: { data: [], pagination: { limit: 50, hasMore: false, nextCursor: null } },
  }),
}));

const emptyJobList = {
  data: [],
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage: jest.fn(),
};

jest.mock("@/hooks/api/kb", () => ({
  useImportKbPages: () => ({ mutate: jest.fn(), isPending: false }),
  useKbImportJobs: () => emptyJobList,
  useKbExportJobs: () => emptyJobList,
}));

beforeEach(() => {
  mockReplace.mockClear();
  mockSearchParams = new URLSearchParams();
  grantedPermissions = [];
});

describe("Import and Export tabs are gated separately", () => {
  it("shows both tabs when the user holds both permissions, so the denials below are not vacuous", () => {
    grantedPermissions = ["kb:pages:import", "kb:pages:export"];

    render(<ImportPage />);

    expect(screen.getByRole("tab", { name: /^import$/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /^export$/i })).toBeInTheDocument();
  });

  it("reaches Export with only the export permission, because export must not require import", () => {
    grantedPermissions = ["kb:pages:export"];

    render(<ImportPage />);

    expect(screen.getByRole("tab", { name: /^export$/i })).toBeInTheDocument();
    expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
  });

  it("hides the Import tab from an export-only user rather than showing a tab that denies", () => {
    grantedPermissions = ["kb:pages:export"];

    render(<ImportPage />);

    expect(screen.queryByRole("tab", { name: /^import$/i })).not.toBeInTheDocument();
  });

  it("hides the Export tab from an import-only user, so the split cuts both ways", () => {
    grantedPermissions = ["kb:pages:import"];

    render(<ImportPage />);

    expect(screen.getByRole("tab", { name: /^import$/i })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /^export$/i })).not.toBeInTheDocument();
  });

  it("denies the whole page only when the user holds neither permission", () => {
    grantedPermissions = [];

    render(<ImportPage />);

    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });

  it("ignores a tab URL param the user cannot use and lands on one they can", () => {
    grantedPermissions = ["kb:pages:export"];
    mockSearchParams = new URLSearchParams("tab=import");

    render(<ImportPage />);

    expect(screen.getByRole("tab", { name: /^export$/i })).toHaveAttribute(
      "data-state",
      "active",
    );
  });
});
