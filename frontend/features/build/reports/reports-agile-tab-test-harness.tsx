import React from "react";
import type { ReactNode } from "react";

export const mockUseVelocityReport = jest.fn();
export const mockUseBurnupReport = jest.fn();
export const mockUseCycleTimeReport = jest.fn();
export const mockUseLeadTimeReport = jest.fn();
export const mockUseCfdReport = jest.fn();
export const mockUseCriticalPath = jest.fn();
export const mockUsePageState = jest.fn();

jest.mock("@/hooks/api/build/reports", () => ({
  useVelocityReport: (...args: unknown[]) => mockUseVelocityReport(...args),
  useBurnupReport: (...args: unknown[]) => mockUseBurnupReport(...args),
  useCfdReport: (...args: unknown[]) => mockUseCfdReport(...args),
  useCriticalPath: (...args: unknown[]) => mockUseCriticalPath(...args),
  useCycleTimeReport: (...args: unknown[]) => mockUseCycleTimeReport(...args),
  useLeadTimeReport: (...args: unknown[]) => mockUseLeadTimeReport(...args),
  useCaptureSnapshot: jest
    .fn()
    .mockReturnValue({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: unknown[]) => mockUsePageState(...args),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    loading,
    empty,
    children,
  }: {
    resolution: { kind: string; permission?: string | null };
    loading: ReactNode;
    empty?: ReactNode;
    children: ReactNode;
  }) => {
    if (resolution.kind === "loading") return <>{loading}</>;
    if (resolution.kind === "denied")
      return (
        <div
          data-testid="no-permission"
          data-permission={resolution.permission ?? ""}
        />
      );
    if (resolution.kind === "error")
      return <div data-testid="error-state" />;
    if (resolution.kind === "empty") return <>{empty}</>;
    return <>{children}</>;
  },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useCanState: jest.fn(() => "granted"),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/components/pm-chrome", () => ({
  PmSection: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock(
  "next/dynamic",
  () => (factory: () => Promise<{ default: (p: unknown) => ReactNode }>) => {
    let Component: ((p: unknown) => ReactNode) | null = null;
    factory()
      .then((mod) => {
        Component = mod.default;
      })
      .catch(() => {});
    return function DynamicStub(props: unknown) {
      return Component ? (
        <Component {...(props as object)} />
      ) : (
        <div data-testid="dynamic-loading" />
      );
    };
  },
);

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/components/illustrations", () => ({
  EmptyLeaderboardIllustration: () => null,
  EmptySearchIllustration: () => null,
}));

jest.mock("./chart-card", () => ({
  ChartCard: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  numberFormatter: { format: (n: number) => String(n) },
}));

jest.mock("./velocity-chart", () => ({
  VelocityChart: () => <div data-testid="velocity-chart" />,
}));

jest.mock("./burnup-chart", () => ({
  BurnupChart: () => <div data-testid="burnup-chart" />,
}));

jest.mock("./cycle-time-chart", () => ({
  CycleTimeChart: () => <div data-testid="cycle-time-chart" />,
}));

jest.mock("./lead-time-chart", () => ({
  LeadTimeChart: () => <div data-testid="lead-time-chart" />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

jest.mock("@/components/shared/loading-state", () => ({
  LoadingState: () => <div data-testid="loading-state" />,
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ title }: { title?: string }) => (
    <div data-testid="error-state">{title}</div>
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: () => null,
}));

jest.mock("lucide-react", () => ({
  Gauge: () => null,
  TrendingUp: () => null,
  BarChart2: () => null,
  Target: () => null,
  Activity: () => null,
  GitMerge: () => null,
  Timer: () => null,
  ChevronRight: () => null,
  AlertTriangle: () => null,
  Route: () => null,
  Layers: () => null,
  Camera: () => null,
}));
