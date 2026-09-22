import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "u1", name: "Ada" }, orgId: "org-1" },
    status: "authenticated",
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn().mockResolvedValue({}) },
}));

const accessData = {
  isOrgOwner: true,
  scopes: { "crm:leads:view": "all", "hr:analytics:read": "all" },
  modules: { CRM: true, HR: true },
  canManageOrganizationMembership: false,
};

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useCanState: () => "granted",
  useAccess: () => ({
    data: accessData,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
  useModuleEnabled: () => true,
}));

const executiveData = {
  headcount: 40,
  openRoles: 3,
  activeProjects: 7,
  conversionRate: 22,
  mrr: 5000,
  pipelineValue: 20000,
  newLeadsThisWeek: 8,
};

jest.mock("@/hooks/api/dashboard", () => ({
  useExecutiveDashboard: () => ({
    data: executiveData,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

import { ExecutiveKpiWidget } from "@/components/dashboard/executive-kpi-widget";
import { BusinessPulseWidget } from "@/components/dashboard/project-health-widget";

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={makeClient()}>{children}</QueryClientProvider>
  );
}

describe("T3 — Conversion Rate appears exactly once across Home", () => {
  it("conversionRate renders exactly once when both widgets are mounted", () => {
    render(
      <Wrapper>
        <ExecutiveKpiWidget />
        <BusinessPulseWidget />
      </Wrapper>,
    );

    const matches = screen.getAllByText(/conversion rate/i);
    expect(matches).toHaveLength(1);
  });

  it("ExecutiveKpiWidget does NOT render conversionRate", () => {
    render(
      <Wrapper>
        <ExecutiveKpiWidget />
      </Wrapper>,
    );
    expect(screen.queryByText(/conversion rate/i)).not.toBeInTheDocument();
  });

  it("BusinessPulseWidget renders conversionRate", () => {
    render(
      <Wrapper>
        <BusinessPulseWidget />
      </Wrapper>,
    );
    expect(screen.getByText(/conversion rate/i)).toBeInTheDocument();
  });
});

describe("T3 — ExecutiveKpiWidget shows business-wide metrics only", () => {
  it("renders Headcount", () => {
    render(
      <Wrapper>
        <ExecutiveKpiWidget />
      </Wrapper>,
    );
    expect(screen.getByText("Headcount")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
  });

  it("renders Open Roles", () => {
    render(
      <Wrapper>
        <ExecutiveKpiWidget />
      </Wrapper>,
    );
    expect(screen.getByText("Open Roles")).toBeInTheDocument();
  });

  it("renders Active Projects", () => {
    render(
      <Wrapper>
        <ExecutiveKpiWidget />
      </Wrapper>,
    );
    expect(screen.getByText("Active Projects")).toBeInTheDocument();
  });
});

describe("T3 — BusinessPulseWidget shows CRM metrics", () => {
  it("renders MRR (Won)", () => {
    render(
      <Wrapper>
        <BusinessPulseWidget />
      </Wrapper>,
    );
    expect(screen.getByText("MRR (Won)")).toBeInTheDocument();
  });

  it("renders Pipeline Value", () => {
    render(
      <Wrapper>
        <BusinessPulseWidget />
      </Wrapper>,
    );
    expect(screen.getByText("Pipeline Value")).toBeInTheDocument();
  });

  it("renders New Leads This Week", () => {
    render(
      <Wrapper>
        <BusinessPulseWidget />
      </Wrapper>,
    );
    expect(screen.getByText("New Leads This Week")).toBeInTheDocument();
  });
});
