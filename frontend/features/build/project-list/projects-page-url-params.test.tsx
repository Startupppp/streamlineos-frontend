import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let mockSearchParams = new URLSearchParams();
const mockReplace = jest.fn();
const mockUseInfiniteProjects = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  usePathname: () => "/build/projects",
  useSearchParams: () => mockSearchParams,
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
  useModuleEnabled: () => true,
  useAccess: () => ({
    data: { isOrgOwner: false, scopes: { "build:view": "all" }, modules: {} },
    isLoading: false,
  }),
}));

jest.mock("@/components/auth/require-module", () => ({
  RequireModule: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/hooks/api/build/projects", () => ({
  useInfiniteProjects: (filters: unknown) => mockUseInfiniteProjects(filters),
  useProject: () => ({ data: undefined, isError: false, error: null }),
}));

jest.mock("./new-project-dialog", () => ({
  NewProjectDialog: () => null,
}));

import React from "react";
import { ProjectsPage } from "./projects-page";

function emptyProjectsResult() {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParams = new URLSearchParams();
  mockUseInfiniteProjects.mockReturnValue(emptyProjectsResult());
  mockReplace.mockReset();
});

describe("ProjectsPage — productId URL param", () => {
  it("passes managedProductId to useInfiniteProjects from the productId URL param so the API returns only that product's projects", () => {
    mockSearchParams = new URLSearchParams("productId=7");

    render(<ProjectsPage />);

    const calls = mockUseInfiniteProjects.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0]?.[0]).toMatchObject({ managedProductId: 7 });
  });

  it("omits managedProductId from useInfiniteProjects when productId is absent so the API returns all projects", () => {
    mockSearchParams = new URLSearchParams();

    render(<ProjectsPage />);

    const calls = mockUseInfiniteProjects.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0]?.[0]).not.toHaveProperty("managedProductId");
  });

  it("prefers the managedProductId prop over the productId URL param so the product-scoped page renders correctly", () => {
    mockSearchParams = new URLSearchParams("productId=7");

    render(<ProjectsPage managedProductId={3} />);

    const calls = mockUseInfiniteProjects.mock.calls;
    expect(calls[0]?.[0]).toMatchObject({ managedProductId: 3 });
  });

  it("uses product-scoped copy when rendered from a managed-product route", () => {
    render(<ProjectsPage managedProductId={3} />);

    expect(screen.getByRole("heading", { name: "Linked Projects" })).toBeInTheDocument();
    expect(screen.getByText("Projects linked to this managed product")).toBeInTheDocument();
  });
});

describe("ProjectsPage — managerId URL param", () => {
  it("reads managerId from the URL so the manager filter can be deep-linked", () => {
    mockSearchParams = new URLSearchParams("managerId=user-abc");

    render(<ProjectsPage />);

    expect(mockUseInfiniteProjects).toHaveBeenCalled();
  });

  it("falls back to filterLead for backward-compatible deep links from existing bookmarks", () => {
    mockSearchParams = new URLSearchParams("filterLead=user-abc");

    render(<ProjectsPage />);

    expect(mockUseInfiniteProjects).toHaveBeenCalled();
  });
});

describe("ProjectsPage — clientId URL param", () => {
  it("reads clientId from the URL without crashing so the filter position is reserved for when the API adds server-side support", () => {
    mockSearchParams = new URLSearchParams("clientId=user-xyz");

    expect(() => render(<ProjectsPage />)).not.toThrow();
  });
});

describe("ProjectsPage — health URL param reaches the server", () => {
  it("passes filterHealth to useInfiniteProjects, so the health chip narrows the whole result set and not one keyset page", () => {
    mockSearchParams = new URLSearchParams("filterHealth=off_track");
    render(<ProjectsPage />);
    expect(mockUseInfiniteProjects).toHaveBeenCalledWith(
      expect.objectContaining({ health: "off_track" }),
    );
  });

  it("passes no health when the param is absent — paired with the present case above", () => {
    render(<ProjectsPage />);
    const [filters] = mockUseInfiniteProjects.mock.calls.at(-1) as [Record<string, unknown>];
    expect("health" in filters).toBe(false);
  });

  it("passes no health for a band the backend enum does not define, which a strict schema would reject", () => {
    mockSearchParams = new URLSearchParams("filterHealth=exploding");
    render(<ProjectsPage />);
    const [filters] = mockUseInfiniteProjects.mock.calls.at(-1) as [Record<string, unknown>];
    expect("health" in filters).toBe(false);
  });
});

describe("ProjectsPage — search input does not reset mid-keystroke", () => {
  it("keeps all typed characters in the input without resetting, because the URL write is debounced not immediate", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<ProjectsPage />);

    const searchInput = screen.getByRole("searchbox");
    await user.type(searchInput, "hello");

    expect(searchInput).toHaveValue("hello");
    jest.useRealTimers();
  });

  it("does not call router.replace on each individual keystroke, only after the 300ms debounce window", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<ProjectsPage />);

    const searchInput = screen.getByRole("searchbox");
    await user.type(searchInput, "hi");

    mockReplace.mockClear();
    act(() => jest.advanceTimersByTime(50));
    expect(mockReplace).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(300));
    expect(mockReplace).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it("does not overwrite in-progress typing when the URL round-trip from the debounced value lands mid-keystroke", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { rerender } = render(<ProjectsPage />);

    const searchInput = screen.getByRole("searchbox");

    await user.type(searchInput, "hel");
    act(() => jest.advanceTimersByTime(300));

    await user.type(searchInput, "l");

    mockSearchParams = new URLSearchParams("q=hel");
    rerender(<ProjectsPage />);

    expect(searchInput).toHaveValue("hell");

    jest.useRealTimers();
  });
});
