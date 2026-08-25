import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CalendarSourcePanel } from "./calendar-source-panel";

let mockIsMobile = false;

jest.mock("@/hooks/common/use-mobile", () => ({
  useIsMobile: () => mockIsMobile,
}));

jest.mock("@/hooks/api/calendar", () => ({
  useCalendarSources: jest.fn(),
  useSetCalendarSourcePreference: jest.fn(),
}));

const { useCalendarSources, useSetCalendarSourcePreference } =
  jest.requireMock<{
    useCalendarSources: jest.Mock;
    useSetCalendarSourcePreference: jest.Mock;
  }>("@/hooks/api/calendar");

function setSourcesLoading() {
  useCalendarSources.mockReturnValue({
    data: undefined,
    isLoading: true,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
}

function setSourcesError(message = "Network error") {
  useCalendarSources.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: true,
    error: new Error(message),
    refetch: jest.fn(),
  });
}

function setSourcesData(
  sources: Array<{ key: string; label: string; module: string; enabled: boolean }>,
) {
  useCalendarSources.mockReturnValue({
    data: sources,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
}

beforeEach(() => {
  mockIsMobile = false;
  useSetCalendarSourcePreference.mockReturnValue({
    mutate: jest.fn(),
    isPending: false,
  });
});

function openPanel() {
  fireEvent.click(screen.getByRole("button", { name: "Event sources" }));
}

describe("CalendarSourcePanel", () => {
  it("renders a trigger button labelled Event sources", () => {
    setSourcesLoading();
    render(<CalendarSourcePanel />);
    expect(screen.getByRole("button", { name: "Event sources" })).not.toBeNull();
  });

  it("shows skeletons while loading", async () => {
    setSourcesLoading();
    render(<CalendarSourcePanel />);
    openPanel();
    await waitFor(() => {
      expect(document.querySelector(".animate-pulse")).not.toBeNull();
    });
  });

  it("shows an error state with a retry button when the query fails", async () => {
    setSourcesError("Failed to fetch sources");
    render(<CalendarSourcePanel />);
    openPanel();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /try again/i })).not.toBeNull();
    });
  });

  it("renders source labels, never raw keys or module ids", async () => {
    setSourcesData([
      { key: "hr-leaves", label: "Leaves", module: "hr", enabled: true },
      { key: "hr-holidays", label: "Holidays", module: "hr", enabled: false },
    ]);
    render(<CalendarSourcePanel />);
    openPanel();
    await waitFor(() => {
      expect(screen.getByText("Leaves")).not.toBeNull();
      expect(screen.getByText("Holidays")).not.toBeNull();
      expect(screen.queryByText("hr-leaves")).toBeNull();
      expect(screen.queryByText("hr-holidays")).toBeNull();
    });
  });

  it("calls the mutation with enabled=false when a checked source is toggled off", async () => {
    const mutate = jest.fn();
    useSetCalendarSourcePreference.mockReturnValue({ mutate, isPending: false });
    setSourcesData([
      { key: "hr-leaves", label: "Leaves", module: "hr", enabled: true },
    ]);
    render(<CalendarSourcePanel />);
    openPanel();
    await waitFor(() => {
      expect(screen.getByRole("switch", { name: "Toggle Leaves" })).not.toBeNull();
    });
    fireEvent.click(screen.getByRole("switch", { name: "Toggle Leaves" }));
    expect(mutate).toHaveBeenCalledWith(
      { sourceKey: "hr-leaves", enabled: false },
      expect.any(Object),
    );
  });

  it("calls the mutation with enabled=true when a disabled source is toggled on", async () => {
    const mutate = jest.fn();
    useSetCalendarSourcePreference.mockReturnValue({ mutate, isPending: false });
    setSourcesData([
      { key: "hr-holidays", label: "Holidays", module: "hr", enabled: false },
    ]);
    render(<CalendarSourcePanel />);
    openPanel();
    await waitFor(() => {
      expect(screen.getByRole("switch", { name: "Toggle Holidays" })).not.toBeNull();
    });
    fireEvent.click(screen.getByRole("switch", { name: "Toggle Holidays" }));
    expect(mutate).toHaveBeenCalledWith(
      { sourceKey: "hr-holidays", enabled: true },
      expect.any(Object),
    );
  });

  it("disables all switches while a mutation is in flight", async () => {
    useSetCalendarSourcePreference.mockReturnValue({ mutate: jest.fn(), isPending: true });
    setSourcesData([
      { key: "hr-leaves", label: "Leaves", module: "hr", enabled: true },
    ]);
    render(<CalendarSourcePanel />);
    openPanel();
    await waitFor(() => {
      const sw = screen.getByRole("switch", { name: "Toggle Leaves" });
      expect((sw as HTMLButtonElement).disabled).toBe(true);
    });
  });

  it("shows an empty message when the source list is empty", async () => {
    setSourcesData([]);
    render(<CalendarSourcePanel />);
    openPanel();
    await waitFor(() => {
      expect(screen.getByText(/no sources available/i)).not.toBeNull();
    });
  });

  it("shows a failure banner naming the failed sources", async () => {
    setSourcesData([]);
    render(
      <CalendarSourcePanel
        failures={[{ key: "hr-leaves", label: "Leaves" }]}
      />,
    );
    openPanel();
    await waitFor(() => {
      expect(screen.getByText(/some events could not be loaded/i)).not.toBeNull();
    });
  });

  it("banner shows the human label of the failed source, not the internal key", async () => {
    setSourcesData([]);
    render(
      <CalendarSourcePanel
        failures={[{ key: "internal-key-hr-leaves", label: "Leaves" }]}
      />,
    );
    openPanel();
    await waitFor(() => {
      expect(screen.getByText(/Leaves/)).not.toBeNull();
      expect(screen.queryByText(/internal-key-hr-leaves/)).toBeNull();
    });
  });
});

describe("CalendarSourcePanel — mobile drawer", () => {
  it("uses a bottom drawer on mobile", async () => {
    mockIsMobile = true;
    setSourcesLoading();
    render(<CalendarSourcePanel />);
    openPanel();
    await waitFor(() => {
      expect(document.querySelector("[data-slot='drawer-content']")).not.toBeNull();
    });
  });
});
