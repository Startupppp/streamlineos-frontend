import { fireEvent, render, screen } from "@testing-library/react";

let mockQueryString = "";
const replace = jest.fn((href: string) => {
  mockQueryString = String(href).split("?")[1] ?? "";
});

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(mockQueryString),
  usePathname: () => "/hr/leaves",
}));

import { useUrlTab } from "@/hooks/api/hr/use-url-tab";

const TABS = ["my-leaves", "wfh", "approvals"] as const;

function Harness() {
  const { activeTab, onTabChange } = useUrlTab(TABS, "my-leaves");
  function handleGoToWfh() {
    onTabChange("wfh");
  }
  function handleGoToDefault() {
    onTabChange("my-leaves");
  }
  return (
    <div>
      <output>{activeTab}</output>
      <button type="button" onClick={handleGoToWfh}>
        wfh
      </button>
      <button type="button" onClick={handleGoToDefault}>
        default
      </button>
    </div>
  );
}

beforeEach(() => {
  mockQueryString = "";
  replace.mockClear();
});

describe("useUrlTab", () => {
  it("restores ?tab=wfh instead of resetting to the default tab", () => {
    mockQueryString = "tab=wfh";
    render(<Harness />);
    expect(screen.getByRole("status")).toHaveTextContent("wfh");
  });

  it("falls back to the default for an unknown tab value", () => {
    mockQueryString = "tab=nonsense";
    render(<Harness />);
    expect(screen.getByRole("status")).toHaveTextContent("my-leaves");
  });

  it("writes the tab into the URL rather than keeping it local", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "wfh" }));
    expect(replace).toHaveBeenCalledWith("?tab=wfh", { scroll: false });
  });

  it("drops the param again for the default tab so the URL stays clean", () => {
    mockQueryString = "tab=wfh";
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "default" }));
    expect(replace).toHaveBeenCalledWith("?", { scroll: false });
  });
});
