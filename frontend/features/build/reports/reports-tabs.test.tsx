import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

const mockReplace = jest.fn();
let mockSearch = "";

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/build/1/reports",
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock("./reports-agile-tab", () => ({
  ReportsAgileTab: () => <div data-testid="agile-tab-content" />,
}));

jest.mock("./reports-overview-tab", () => ({
  ReportsOverviewTab: () => <div data-testid="overview-tab-content" />,
}));

import { ReportsTabs } from "./reports-tabs";

function lastParams() {
  const url = mockReplace.mock.calls.at(-1)?.[0] as string;
  return new URLSearchParams(url.split("?")[1] ?? "");
}

beforeEach(() => {
  mockReplace.mockClear();
  mockSearch = "";
});

describe("ReportsTabs — URL-backed tab state (FE-86)", () => {
  it("renders the agile tab by default when no tab param is present", () => {
    render(<ReportsTabs projectId={1} />);
    expect(screen.getByRole("tab", { name: "Agile Reports" })).toHaveAttribute(
      "data-state",
      "active",
    );
  });

  it("activates the overview tab when tab=overview is in the URL", () => {
    mockSearch = "tab=overview";
    render(<ReportsTabs projectId={1} />);
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute(
      "data-state",
      "active",
    );
  });

  it("treats an unrecognised tab value as the default agile tab", () => {
    mockSearch = "tab=unknown";
    render(<ReportsTabs projectId={1} />);
    expect(screen.getByRole("tab", { name: "Agile Reports" })).toHaveAttribute(
      "data-state",
      "active",
    );
  });

  it("writes tab=overview to the URL with scroll:false when overview is selected", async () => {
    const user = userEvent.setup();
    render(<ReportsTabs projectId={1} />);
    await user.click(screen.getByRole("tab", { name: "Overview" }));
    expect(lastParams().get("tab")).toBe("overview");
    expect(mockReplace).toHaveBeenLastCalledWith(
      expect.stringContaining("tab=overview"),
      { scroll: false },
    );
  });

  it("removes the tab param when switching back to the default agile tab", async () => {
    mockSearch = "tab=overview";
    const user = userEvent.setup();
    render(<ReportsTabs projectId={1} />);
    await user.click(screen.getByRole("tab", { name: "Agile Reports" }));
    expect(lastParams().has("tab")).toBe(false);
    expect(mockReplace).toHaveBeenLastCalledWith(
      expect.not.stringContaining("tab="),
      { scroll: false },
    );
  });

  it("preserves existing query params when switching tabs", async () => {
    mockSearch = "foo=bar";
    const user = userEvent.setup();
    render(<ReportsTabs projectId={1} />);
    await user.click(screen.getByRole("tab", { name: "Overview" }));
    expect(lastParams().get("foo")).toBe("bar");
    expect(lastParams().get("tab")).toBe("overview");
  });
});
