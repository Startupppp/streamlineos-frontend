import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { EstimateVsActualChart, type EstimateChartRow } from "./project-charts-impl";

jest.mock("recharts", () => {
  const Group = ({ children }: { children?: ReactNode }) => <g>{children}</g>;
  return {
    ResponsiveContainer: ({ children, height }: { children: ReactNode; height: number }) => <svg height={height} data-testid="estimate-chart">{children}</svg>,
    ScatterChart: Group,
    Scatter: ({ data, children }: { data: EstimateChartRow[]; children: ReactNode }) => <g><text>{JSON.stringify(data)}</text>{children}</g>,
    XAxis: ({ name }: { name: string }) => <text>{name}</text>,
    YAxis: ({ name }: { name: string }) => <text>{name}</text>,
    Tooltip: () => null,
    Cell: () => null,
    CartesianGrid: () => null,
  };
});

it("preserves the public chart export and estimation empty state", () => {
  render(<EstimateVsActualChart data={[]} />);
  expect(screen.getByText("No estimation data yet")).toBeInTheDocument();
  expect(screen.queryByTestId("estimate-chart")).not.toBeInTheDocument();
});

it("retains the point data, axes and shared chart height", () => {
  const data: EstimateChartRow[] = [{ label: "BUILD-1", estimate: 3, actual: 5 }];
  render(<EstimateVsActualChart data={data} />);
  expect(screen.getByTestId("estimate-chart")).toHaveAttribute("height", "220");
  expect(screen.getByText("Estimate")).toBeInTheDocument();
  expect(screen.getByText("Actual")).toBeInTheDocument();
  expect(screen.getByText(JSON.stringify(data))).toBeInTheDocument();
});
