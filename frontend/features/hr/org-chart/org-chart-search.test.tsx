import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrgChartPage } from "./org-chart-page";

const replace = jest.fn();
let currentQuery = "";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: jest.fn() }),
  usePathname: () => "/hr/org-chart",
  useSearchParams: () => new URLSearchParams(currentQuery),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => false,
  useAccess: () => ({ data: { scopes: {}, modules: {} }, refetch: jest.fn() }),
  useModuleEnabled: () => true,
}));

let pageStateKind: "loading" | "denied" = "loading";
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () =>
    pageStateKind === "denied"
      ? { kind: "denied", permission: "hr:employees:view" }
      : { kind: "loading" },
}));

jest.mock("./use-org-chart", () => ({
  useHrOrgChart: () => ({ isPending: true, isError: false, error: null, data: undefined, refetch: jest.fn() }),
}));

describe("org chart search keeps every character the person types", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    replace.mockClear();
    currentQuery = "";
    pageStateKind = "loading";
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("writes the URL once the typing pauses, never on each keystroke", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<OrgChartPage />);
    const input = screen.getByRole("searchbox");

    await user.type(input, "hh");
    expect(input).toHaveValue("hh");
    expect(replace).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenLastCalledWith("/hr/org-chart?q=hh", { scroll: false });
  });

  it("keeps the draft when the URL catches up with it", async () => {
    currentQuery = "q=hh";
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<OrgChartPage />);
    const input = screen.getByRole("searchbox");
    expect(input).toHaveValue("hh");

    await user.type(input, "x");
    expect(input).toHaveValue("hhx");
  });

  it("keeps a character typed while the URL write is still in flight", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const { rerender } = render(<OrgChartPage />);
    const input = screen.getByRole("searchbox");

    await user.type(input, "h");
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(replace).toHaveBeenLastCalledWith("/hr/org-chart?q=h", { scroll: false });

    await user.type(input, "h");
    currentQuery = "q=h";
    rerender(<OrgChartPage />);

    expect(input).toHaveValue("hh");

    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(replace).toHaveBeenLastCalledWith("/hr/org-chart?q=hh", { scroll: false });
  });

  it("follows the URL when it changes from outside the field", () => {
    currentQuery = "q=hh";
    const { rerender } = render(<OrgChartPage />);
    expect(screen.getByRole("searchbox")).toHaveValue("hh");

    currentQuery = "q=ada";
    rerender(<OrgChartPage />);

    expect(screen.getByRole("searchbox")).toHaveValue("ada");
  });

  it("tells a caller without hr:employees:view they are denied, not an endless skeleton", () => {
    pageStateKind = "denied";
    render(<OrgChartPage />);
    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
  });
});
