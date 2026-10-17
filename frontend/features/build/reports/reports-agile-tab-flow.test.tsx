import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import "./reports-agile-tab-test-harness";
import { useCan } from "@/hooks/api/access";
import { useCaptureSnapshot } from "@/hooks/api/build/reports";
import {
  mockUsePageState,
  mockUseCfdReport,
  mockUseCriticalPath,
  mockUseVelocityReport,
  mockUseBurnupReport,
} from "./reports-agile-tab-test-harness";
import {
  installAgileMocks,
  CRITICAL_PATH_DATA,
  STATUS_FILTER,
} from "./reports-agile-tab-test-fixtures";
import {
  encodeFilterEnvelope as encodeReportFilter,
  decodeFilterEnvelope as decodeReportFilter,
} from "@/lib/filter-envelope/filter-envelope-v1";
import { CfdSection } from "./cfd-section";
import { CriticalPathSection } from "./critical-path-section";
import { VelocitySection } from "./velocity-section";
import { BurnupSection } from "./burnup-section";

beforeEach(() => {
  installAgileMocks();
  jest.mocked(useCan).mockReturnValue(true);
});

describe("ReportFilterEnvelope — encode/decode round-trip (BT-9ce12613e7f6)", () => {
  it("round-trips an envelope with a single status clause through encode and decode without data loss", () => {
    const envelope = {
      version: 1 as const,
      logic: "and" as const,
      filters: [{ field: "status", op: "is" as const, value: "done" }],
    };
    const encoded = encodeReportFilter(envelope);
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(0);
    const decoded = decodeReportFilter(encoded);
    expect(decoded).toEqual(envelope);
  });

  it("round-trips an empty envelope through encode and decode — positive control for zero-clause case", () => {
    const envelope = { version: 1 as const, logic: "and" as const, filters: [] };
    const decoded = decodeReportFilter(encodeReportFilter(envelope));
    expect(decoded).toEqual(envelope);
  });

  it("returns null when decoding a corrupt encoded string — positive control confirms failure is handled", () => {
    expect(decodeReportFilter("not-valid-base64!!")).toBeNull();
  });
});

describe("CfdSection — page states", () => {
  it("passes build:view permission and error to usePageState so 402 errors are classified correctly", () => {
    const err = new Error("Network timeout");
    mockUseCfdReport.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: err, refetch: jest.fn() });
    render(<CfdSection projectId={1} />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:view", error: err }),
    );
  });

  it("renders the loading state while CFD data is in flight", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "loading" });
    render(<CfdSection projectId={1} />);
    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
  });

  it("renders an error panel when usePageState resolves to error", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "error", error: new Error("Network timeout") });
    render(<CfdSection projectId={1} />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });

  it("renders the empty state when there are no CFD data points — positive control shows flow history prompt", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "empty" });
    render(<CfdSection projectId={1} />);
    expect(screen.getByText(/no flow history yet/i)).toBeInTheDocument();
  });

  it("does not render the empty or error state when series data is present — positive control confirms data reaches the chart layer", () => {
    mockUseCfdReport.mockReturnValue({
      data: { series: [{ date: "2026-01-01", backlog: 5, unstarted: 2, started: 3, completed: 1, cancelled: 0 }] },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<CfdSection projectId={1} />);
    expect(screen.queryByText(/no flow history yet/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  });

  it("shows a denied view instead of a blank panel when build:view is denied — FE-40 compliance", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "denied", permission: "build:view" });
    render(<CfdSection projectId={1} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  });

  it.each(["ready", "empty"])("offers no snapshot action to a report viewer in the %s state", (kind) => {
    jest.mocked(useCan).mockImplementation((permission) => permission !== "build:manage");
    mockUsePageState.mockReturnValue({ kind });
    render(<CfdSection projectId={1} />);

    expect(screen.getByRole("heading", { name: "Cumulative Flow" })).toBeInTheDocument();
    expect(screen.queryAllByRole("button", { name: /capture/i })).toHaveLength(0);
    expect(jest.mocked(useCaptureSnapshot).mock.results[0].value.mutate).not.toHaveBeenCalled();
  });

  it.each(["ready", "empty"])("preserves the authorized snapshot action in the %s state", (kind) => {
    mockUsePageState.mockReturnValue({ kind });
    render(<CfdSection projectId={1} />);

    const name = kind === "empty" ? "Capture today's snapshot" : "Capture today";
    fireEvent.click(screen.getByRole("button", { name }));

    expect(jest.mocked(useCaptureSnapshot).mock.results[0].value.mutate).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });
});

describe("CriticalPathSection — page states", () => {
  it("passes build:view permission and error to usePageState so 402 errors are classified correctly", () => {
    const err = new Error("Timeout");
    mockUseCriticalPath.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: err, refetch: jest.fn() });
    render(<CriticalPathSection projectId={1} />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:view", error: err }),
    );
  });

  it("renders the loading state while critical path data is in flight", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "loading" });
    render(<CriticalPathSection projectId={1} />);
    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
  });

  it("renders an error panel when usePageState resolves to error", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "error", error: new Error("Timeout") });
    render(<CriticalPathSection projectId={1} />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });

  it("renders the empty state when there are no dependency chain nodes", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "empty" });
    render(<CriticalPathSection projectId={1} />);
    expect(screen.getByText(/no dependency chain yet/i)).toBeInTheDocument();
  });

  it("renders the chain nodes when critical path data is present — positive control confirms titles reach the UI", () => {
    mockUseCriticalPath.mockReturnValue({ data: CRITICAL_PATH_DATA, isLoading: false, isError: false, error: null, refetch: jest.fn() });
    render(<CriticalPathSection projectId={1} />);
    expect(screen.getByText("Design API")).toBeInTheDocument();
    expect(screen.getByText("Implement endpoint")).toBeInTheDocument();
    expect(screen.queryByText(/no dependency chain yet/i)).not.toBeInTheDocument();
  });

  it("shows a denied view instead of a blank panel when build:view is denied — FE-40 compliance", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "denied", permission: "build:view" });
    render(<CriticalPathSection projectId={1} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  });
});

describe("FilterEnvelope wiring — VelocitySection passes filterEnvelope to useVelocityReport (BT-185db6b8a5ca)", () => {
  it("passes the filterEnvelope to useVelocityReport when provided — positive control confirms wiring", () => {
    render(<VelocitySection projectId={1} filterEnvelope={STATUS_FILTER} />);
    expect(mockUseVelocityReport).toHaveBeenCalledWith(1, STATUS_FILTER);
  });

  it("calls useVelocityReport with only projectId when no filterEnvelope provided — no-filter baseline", () => {
    render(<VelocitySection projectId={1} />);
    expect(mockUseVelocityReport).toHaveBeenCalledWith(1, undefined);
  });
});

describe("FilterEnvelope wiring — BurnupSection passes filterEnvelope to hooks (BT-185db6b8a5ca)", () => {
  it("passes filterEnvelope to useVelocityReport and useBurnupReport when provided — positive control confirms wiring", () => {
    render(<BurnupSection projectId={2} filterEnvelope={STATUS_FILTER} />);
    expect(mockUseVelocityReport).toHaveBeenCalledWith(2, STATUS_FILTER);
    const burnupCall = mockUseBurnupReport.mock.calls.find(
      (args) => args[0] === 2 && args[2] === STATUS_FILTER,
    );
    expect(burnupCall).toBeDefined();
  });
});

describe("CfdSection — snapshots are project-wide, so active filters are disclosed, never sent", () => {
  it("tells the reader filters do not apply and still requests the unfiltered report", () => {
    render(<CfdSection projectId={3} filtersActive />);
    expect(mockUseCfdReport).toHaveBeenCalledWith(3, expect.any(Number));
    expect(screen.getByText(/Filters do not apply to this chart/)).toBeInTheDocument();
  });

  it("shows no filter note when no filter is active", () => {
    render(<CfdSection projectId={3} />);
    expect(screen.queryByText(/Filters do not apply to this chart/)).not.toBeInTheDocument();
  });
});
