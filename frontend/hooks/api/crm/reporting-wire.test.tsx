import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import type { PermissionKey } from "@/lib/rbac/permissions";
import type { ReportingQueryDescription } from "@/types/crm/reporting";
import {
  useCreateReportDefinition,
  useCreateReportSchedule,
  useDeleteReportDefinition,
  useDeleteReportSchedule,
  useReportDefinition,
  useReportDefinitionRun,
  useReportDefinitions,
  useReportExplain,
  useReportRun,
  useReportRuns,
  useReportSchedules,
  useReportingSources,
  useUpdateReportDefinition,
  useUpdateReportSchedule,
} from "./reporting";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const mockGranted = new Set<string>();
jest.mock("@/hooks/api/access", () => {
  const { permissionGate } =
    jest.requireActual<typeof import("@/lib/rbac/permission-gate")>(
      "@/lib/rbac/permission-gate",
    );
  return {
    usePermissionGate: (permission: PermissionKey) =>
      permissionGate(permission, mockGranted.has(permission), true),
    useCan: (permission: PermissionKey) => mockGranted.has(permission),
    useAccess: () => ({ data: { scopes: {}, isOrgOwner: false }, refetch: jest.fn() }),
  };
});


const DESCRIPTION: ReportingQueryDescription = {
  source: "deals",
  select: [{ kind: "field", field: "name" }],
  limit: 50,
};

const PAGE = { limit: 25, offset: 0 };

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function paths(): string[] {
  return [
    ...(apiClient.get as jest.Mock).mock.calls,
    ...(apiClient.post as jest.Mock).mock.calls,
    ...(apiClient.patch as jest.Mock).mock.calls,
    ...(apiClient.delete as jest.Mock).mock.calls,
  ].map(([path]) => path as string);
}

interface GatedRead {
  readonly what: string;
  readonly key: PermissionKey;
  readonly path: string;
  readonly useRead: () => unknown;
}

const READS: readonly GatedRead[] = [
  {
    what: "the sources a caller may report on",
    key: "crm:reporting:run",
    path: "/crm/reporting/sources",
    useRead: () => useReportingSources(),
  },
  {
    what: "an ad-hoc run",
    key: "crm:reporting:run",
    path: "/crm/reporting/run",
    useRead: () => useReportRun(DESCRIPTION),
  },
  {
    what: "the saved reports",
    key: "crm:reporting:view",
    path: "/crm/reporting/definitions",
    useRead: () => useReportDefinitions(PAGE),
  },
  {
    what: "one saved report",
    key: "crm:reporting:view",
    path: "/crm/reporting/definitions/def-1",
    useRead: () => useReportDefinition("def-1"),
  },
  {
    what: "running a saved report",
    key: "crm:reporting:run",
    path: "/crm/reporting/definitions/def-1/run",
    useRead: () => useReportDefinitionRun("def-1", { limit: 25, offset: 0 }),
  },
  {
    what: "the compiled statement",
    key: "crm:reporting:manage",
    path: "/crm/reporting/explain",
    useRead: () => useReportExplain(DESCRIPTION),
  },
  {
    what: "the run log",
    key: "crm:reporting:view",
    path: "/crm/reporting/runs",
    useRead: () => useReportRuns(PAGE),
  },
  {
    what: "the timetable",
    key: "crm:reporting:view",
    path: "/crm/reporting/schedules",
    useRead: () => useReportSchedules(),
  },
];

const REPORTING_KEYS: readonly PermissionKey[] = [
  "crm:reporting:view",
  "crm:reporting:run",
  "crm:reporting:manage",
];

describe("the reporting builder's data layer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGranted.clear();
    (apiClient.get as jest.Mock).mockResolvedValue([]);
    (apiClient.post as jest.Mock).mockResolvedValue({});
    (apiClient.patch as jest.Mock).mockResolvedValue({});
    (apiClient.delete as jest.Mock).mockResolvedValue({ deleted: true });
  });

  describe.each(READS)("$what", ({ key, path, useRead }) => {
    it(`asks ${path}`, async () => {
      mockGranted.add(key);
      renderHook(() => useRead(), { wrapper: wrapper() });

      await waitFor(() => expect(paths()).toContain(path));
    });

    it(`asks nothing without ${key}`, async () => {
      for (const other of REPORTING_KEYS) if (other !== key) mockGranted.add(other);
      renderHook(() => useRead(), { wrapper: wrapper() });

      await Promise.resolve();
      expect(paths()).toHaveLength(0);
    });
  });

  it("runs a saved report through its own id, never down the ad-hoc path", async () => {
    mockGranted.add("crm:reporting:run");
    renderHook(() => useReportDefinitionRun("def-9", { limit: 25, offset: 0 }), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
    expect(paths()).toEqual(["/crm/reporting/definitions/def-9/run"]);
    expect(paths()).not.toContain("/crm/reporting/run");
  });

  it("pages a saved report as overrides, leaving the stored question alone", async () => {
    mockGranted.add("crm:reporting:run");
    renderHook(() => useReportDefinitionRun("def-9", { limit: 25, offset: 50 }), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(apiClient.post).toHaveBeenCalled());
    const [, body] = (apiClient.post as jest.Mock).mock.calls[0] as [string, unknown];
    expect(body).toEqual({ limit: 25, offset: 50 });
  });

  it("asks nothing until there is a question to ask", async () => {
    mockGranted.add("crm:reporting:run");
    mockGranted.add("crm:reporting:manage");
    renderHook(
      () => {
        useReportRun(null);
        useReportExplain(null);
        useReportDefinitionRun("def-1", null);
        useReportDefinition(null);
      },
      { wrapper: wrapper() },
    );

    await Promise.resolve();
    expect(paths()).toHaveLength(0);
  });

  describe("authoring", () => {
    it("addresses only crm/reporting, whichever write it is", async () => {
      mockGranted.add("crm:reporting:manage");
      const { result } = renderHook(
        () => ({
          createDefinition: useCreateReportDefinition(),
          updateDefinition: useUpdateReportDefinition(),
          deleteDefinition: useDeleteReportDefinition(),
          createSchedule: useCreateReportSchedule(),
          updateSchedule: useUpdateReportSchedule(),
          deleteSchedule: useDeleteReportSchedule(),
        }),
        { wrapper: wrapper() },
      );

      await result.current.createDefinition.mutateAsync({
        name: "Won by stage",
        query: DESCRIPTION,
      });
      await result.current.updateDefinition.mutateAsync({
        reportDefinitionId: "def-1",
        name: "Renamed",
      });
      await result.current.deleteDefinition.mutateAsync({ reportDefinitionId: "def-1" });
      await result.current.createSchedule.mutateAsync({
        reportDefinitionId: "def-1",
        cadence: "daily",
        hourOfDay: 8,
        recipients: ["ops@test.invalid"],
      });
      await result.current.updateSchedule.mutateAsync({
        reportScheduleId: "s-1",
        enabled: false,
      });
      await result.current.deleteSchedule.mutateAsync({ reportScheduleId: "s-1" });

      expect([...paths()].sort()).toEqual([
        "/crm/reporting/definitions",
        "/crm/reporting/definitions/def-1",
        "/crm/reporting/definitions/def-1",
        "/crm/reporting/schedules",
        "/crm/reporting/schedules/s-1",
        "/crm/reporting/schedules/s-1",
      ]);
      expect(paths().filter((path) => !path.startsWith("/crm/reporting/"))).toEqual([]);
    });
  });
});
