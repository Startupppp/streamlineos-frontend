import React from "react";
import { render, screen } from "@testing-library/react";
import "./reports-agile-tab-test-harness";
import {
  mockUsePageState,
  mockUseVelocityReport,
  mockUseBurnupReport,
  mockUseCycleTimeReport,
  mockUseLeadTimeReport,
} from "./reports-agile-tab-test-harness";
import {
  installAgileMocks,
  settledVelocity,
  settled,
  failed,
  VELOCITY_DATA,
  BURNUP_DATA,
  CYCLE_DATA,
  LEAD_DATA,
} from "./reports-agile-tab-test-fixtures";
import { VelocitySection } from "./velocity-section";
import { BurnupSection } from "./burnup-section";
import { CycleTimeSection } from "./cycle-time-section";
import { LeadTimeSection } from "./lead-time-section";

beforeEach(installAgileMocks);

describe("VelocitySection — page states", () => {
  it("passes build:view permission and error to usePageState so 402 errors are classified correctly", () => {
    const err = new Error("plan required");
    mockUseVelocityReport.mockReturnValue(failed("plan required"));
    render(<VelocitySection projectId={1} />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:view", error: err }),
    );
  });

  it("renders the loading state while velocity data is in flight", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "loading" });
    render(<VelocitySection projectId={1} />);
    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
    expect(screen.queryByTestId("velocity-chart")).not.toBeInTheDocument();
  });

  it("renders an error panel when usePageState resolves to error", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "error", error: new Error("timeout") });
    render(<VelocitySection projectId={1} />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.queryByTestId("velocity-chart")).not.toBeInTheDocument();
  });

  it("renders the empty state when there are no cycles with velocity data", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "empty" });
    render(<VelocitySection projectId={1} />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.queryByTestId("velocity-chart")).not.toBeInTheDocument();
  });

  it("renders the velocity chart when sprint data is present — positive control confirms rows reach the chart", () => {
    mockUseVelocityReport.mockReturnValue(settledVelocity(VELOCITY_DATA));
    render(<VelocitySection projectId={1} />);
    expect(screen.getByTestId("velocity-chart")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("shows a denied view instead of a blank panel when build:view is denied — FE-40 compliance", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "denied", permission: "build:view" });
    render(<VelocitySection projectId={1} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  });
});

describe("BurnupSection — page states", () => {
  it("passes build:view permission to usePageState so the denial reason is shown", () => {
    render(<BurnupSection projectId={1} />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:view" }),
    );
  });

  it("renders the loading state while either query is in flight", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "loading" });
    render(<BurnupSection projectId={1} />);
    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
  });

  it("renders an error panel when usePageState resolves to error", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "error", error: new Error("timeout") });
    render(<BurnupSection projectId={1} />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });

  it("renders the empty state when there are no burnup data points", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "empty" });
    render(<BurnupSection projectId={1} />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.queryByTestId("burnup-chart")).not.toBeInTheDocument();
  });

  it("renders the burnup chart when burnup points are present — positive control confirms data reaches the chart", () => {
    mockUseVelocityReport.mockReturnValue(settledVelocity(VELOCITY_DATA));
    mockUseBurnupReport.mockReturnValue(settled(BURNUP_DATA));
    render(<BurnupSection projectId={1} />);
    expect(screen.getByTestId("burnup-chart")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("shows a denied view instead of a blank panel when build:view is denied — FE-40 compliance", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "denied", permission: "build:view" });
    render(<BurnupSection projectId={1} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  });
});

describe("CycleTimeSection — page states", () => {
  it("passes build:view permission and error to usePageState so 402 errors are classified correctly", () => {
    const err = new Error("timeout");
    mockUseCycleTimeReport.mockReturnValue(failed("timeout"));
    render(<CycleTimeSection projectId={1} />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:view", error: err }),
    );
  });

  it("renders a skeleton while cycle time data is in flight", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "loading" });
    render(<CycleTimeSection projectId={1} />);
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("cycle-time-chart")).not.toBeInTheDocument();
  });

  it("renders an error panel when usePageState resolves to error", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "error", error: new Error("timeout") });
    render(<CycleTimeSection projectId={1} />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.queryByTestId("cycle-time-chart")).not.toBeInTheDocument();
  });

  it("renders the empty state when there are no cycle time points", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "empty" });
    render(<CycleTimeSection projectId={1} />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.queryByTestId("cycle-time-chart")).not.toBeInTheDocument();
  });

  it("renders the cycle time chart when weekly data is present — positive control confirms data reaches the chart", () => {
    mockUseCycleTimeReport.mockReturnValue(settled(CYCLE_DATA));
    render(<CycleTimeSection projectId={1} />);
    expect(screen.getByTestId("cycle-time-chart")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("shows a denied view instead of a blank panel when build:view is denied — FE-40 compliance", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "denied", permission: "build:view" });
    render(<CycleTimeSection projectId={1} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  });
});

describe("LeadTimeSection — page states", () => {
  it("passes build:view permission and error to usePageState so 402 errors are classified correctly", () => {
    const err = new Error("timeout");
    mockUseLeadTimeReport.mockReturnValue(failed("timeout"));
    render(<LeadTimeSection projectId={1} />);
    expect(mockUsePageState).toHaveBeenCalledWith(
      expect.objectContaining({ permission: "build:view", error: err }),
    );
  });

  it("renders a skeleton while lead time data is in flight", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "loading" });
    render(<LeadTimeSection projectId={1} />);
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("lead-time-chart")).not.toBeInTheDocument();
  });

  it("renders an error panel when usePageState resolves to error", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "error", error: new Error("timeout") });
    render(<LeadTimeSection projectId={1} />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.queryByTestId("lead-time-chart")).not.toBeInTheDocument();
  });

  it("renders the empty state when there are no lead time points", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "empty" });
    render(<LeadTimeSection projectId={1} />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    expect(screen.queryByTestId("lead-time-chart")).not.toBeInTheDocument();
  });

  it("renders the lead time chart when weekly data is present — positive control confirms p50/p90 data reaches the chart", () => {
    mockUseLeadTimeReport.mockReturnValue(settled(LEAD_DATA));
    render(<LeadTimeSection projectId={1} />);
    expect(screen.getByTestId("lead-time-chart")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("shows a denied view instead of a blank panel when build:view is denied — FE-40 compliance", () => {
    mockUsePageState.mockReturnValueOnce({ kind: "denied", permission: "build:view" });
    render(<LeadTimeSection projectId={1} />);
    expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  });
});
