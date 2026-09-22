import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { useCan } from "@/hooks/api/access";
import { useRouter, usePathname } from "next/navigation";
import { useGlobalSearch } from "@/components/command-palette/hooks/use-global-search";
import { CommandPaletteDialogBody } from "../command-palette-dialog";

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => ({ data: { isOrgOwner: false, scopes: {} } }),
  useCan: jest.fn(),
}));

jest.mock("@/hooks/api/access/org-modules", () => ({
  useEnabledModules: () => [],
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: { lockedModules: [] } }),
}));

jest.mock("@/hooks/api/build/projects", () => ({
  useProject: () => ({ data: undefined }),
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useNavigationLeave: () => (fn: () => void) => fn(),
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: (v: string) => v,
}));

jest.mock("@/components/command-palette/hooks/use-global-search", () => ({
  GLOBAL_SEARCH_MIN_LENGTH: 2,
  useGlobalSearch: jest.fn(),
}));

jest.mock("@/components/command-palette", () => ({
  useCommandPalette: () => ({
    paletteOpen: true,
    setPaletteOpen: jest.fn(),
    openCreateTicket: jest.fn(),
  }),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

jest.mock("../sidebar/sidebar-nav-items", () => ({
  getNavGroupsForUser: () => [],
  filterNavGroupsForUser: () => [],
  flattenNavRoutes: () => [],
}));

const mockedUseGlobalSearch = useGlobalSearch as jest.MockedFunction<
  typeof useGlobalSearch
>;

function typeQuery(value: string) {
  fireEvent.change(
    screen.getByPlaceholderText("Search pages, leads, deals, contacts…"),
    { target: { value } },
  );
}

describe("CommandPaletteDialogBody — global search failure", () => {
  beforeEach(() => {
    (useCan as jest.Mock).mockReturnValue(false);
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
    (usePathname as jest.Mock).mockReturnValue("/");
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders an alert instead of the no-results empty state when GET /search returns 500", () => {
    mockedUseGlobalSearch.mockReturnValue({
      results: [],
      isSearching: false,
      isError: true,
      error: new Error("500 Internal Server Error"),
      retry: jest.fn(),
    });

    render(<CommandPaletteDialogBody />);
    typeQuery("acme");

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText(/No results for/)).not.toBeInTheDocument();
  });

  it("still renders the no-results empty state when the same query succeeds with zero results", () => {
    mockedUseGlobalSearch.mockReturnValue({
      results: [],
      isSearching: false,
      isError: false,
      error: null,
      retry: jest.fn(),
    });

    render(<CommandPaletteDialogBody />);
    typeQuery("acme");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText(/No results for/)).toBeInTheDocument();
  });

  it("surfaces the failure message rather than a bare empty list", () => {
    mockedUseGlobalSearch.mockReturnValue({
      results: [],
      isSearching: false,
      isError: true,
      error: new Error("Network error contacting api.example.com"),
      retry: jest.fn(),
    });

    render(<CommandPaletteDialogBody />);
    typeQuery("acme");

    expect(
      screen.getByText(/Network error contacting api\.example\.com/),
    ).toBeInTheDocument();
  });

  it("refetches the failed search when Try again is pressed", () => {
    const retry = jest.fn();
    mockedUseGlobalSearch.mockReturnValue({
      results: [],
      isSearching: false,
      isError: true,
      error: new Error("500 Internal Server Error"),
      retry,
    });

    render(<CommandPaletteDialogBody />);
    typeQuery("acme");
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(retry).toHaveBeenCalledTimes(1);
  });
});
