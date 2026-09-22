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

jest.mock("./use-org-chart", () => ({
  useHrOrgChart: () => ({ isPending: true, isError: false, error: null, data: undefined, refetch: jest.fn() }),
}));

describe("org chart search keeps every character the person types", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    replace.mockClear();
    currentQuery = "";
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
});
