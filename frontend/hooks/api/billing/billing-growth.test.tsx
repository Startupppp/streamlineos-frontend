import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider, useMutation } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import { useEnterpriseQuoteAction } from "@/hooks/api/billing/enterprise-quotes";
import { useMarketplaceAppAction } from "@/hooks/api/billing/marketplace";
import type { EnterpriseQuoteList, EnterpriseQuoteListItem, MarketplaceApp } from "@/hooks/api/billing/billing-growth-schema";

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: (_permission: string, options: object) => useMutation(options),
}));
jest.mock("@/lib/api-client", () => ({ apiClient: { post: jest.fn(), delete: jest.fn() } }));

const keys = growthAndSignQueryKeys.billing;
let client: QueryClient;

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const quote = (id: number, status: EnterpriseQuoteListItem["status"]): EnterpriseQuoteListItem => ({
  id,
  quoteRef: `EQ-000${id}`,
  subject: "Enterprise",
  planTier: "ENTERPRISE",
  negotiatedSeats: 50,
  pricePerSeatInPaise: 149_900,
  contractTermMonths: 12,
  status,
  validUntil: "2026-12-31",
  createdAt: "2026-10-01T00:00:00Z",
  dealName: null,
  clientName: null,
});

const app = (id: number): MarketplaceApp => ({
  id,
  slug: `app-${id}`,
  name: `App ${id}`,
  description: null,
  category: "productivity",
  iconUrl: null,
  screenshotUrls: null,
  features: null,
  pricingType: "free",
  monthlyPrice: 0,
  annualPrice: 0,
  trialDays: 0,
  isActive: true,
  sortOrder: id,
  requiredPlan: null,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
  installation: null,
});

beforeEach(() => {
  (apiClient.post as jest.Mock).mockReset();
  (apiClient.delete as jest.Mock).mockReset();
  client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
});

describe("enterprise quote lifecycle", () => {
  it("moves the quote to its next status in every loaded page, and posts the reject reason", async () => {
    const all = keys.enterpriseQuotes({ limit: 20 });
    const pending = keys.enterpriseQuotes({ status: "PENDING_APPROVAL", limit: 20 });
    const pageOf = (...rows: EnterpriseQuoteListItem[]): EnterpriseQuoteList => ({ data: rows, pagination: { limit: 20, hasMore: false, nextCursor: null } });
    client.setQueryData(all, pageOf(quote(1, "PENDING_APPROVAL"), quote(2, "DRAFT")));
    client.setQueryData(pending, pageOf(quote(1, "PENDING_APPROVAL")));
    (apiClient.post as jest.Mock).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useEnterpriseQuoteAction("reject"), { wrapper });
    await result.current.mutateAsync({ quoteId: 1, reason: "Price too low" });

    expect((apiClient.post as jest.Mock).mock.calls[0]?.slice(0, 2)).toEqual(["/billing/enterprise-quotes/1/reject", { reason: "Price too low" }]);
    expect(client.getQueryData<EnterpriseQuoteList>(all)?.data.map((r) => r.status)).toEqual(["DRAFT", "DRAFT"]);
    expect(client.getQueryData<EnterpriseQuoteList>(pending)?.data[0]?.status).toBe("DRAFT");
  });

  it("marks entitlements stale once a quote is accepted", async () => {
    client.setQueryData(keys.entitlements(), { plan: "ENTERPRISE" });
    (apiClient.post as jest.Mock).mockResolvedValue({ success: true });
    const { result } = renderHook(() => useEnterpriseQuoteAction("accept"), { wrapper });
    await result.current.mutateAsync({ quoteId: 3 });
    expect(client.getQueryState(keys.entitlements())?.isInvalidated).toBe(true);
  });
});

describe("marketplace app actions", () => {
  it("writes the returned installation onto the app, uninstall included", async () => {
    client.setQueryData(keys.marketplaceApps(), [app(1), app(2)]);
    const installation = { id: 9, orgId: "org", appId: 1, installedBy: "u", status: "ACTIVE", trialEndsAt: null, installedAt: "2026-10-17T00:00:00Z", cancelledAt: null };
    (apiClient.post as jest.Mock).mockResolvedValue(installation);
    const { result } = renderHook(() => useMarketplaceAppAction("install"), { wrapper });
    await result.current.mutateAsync(1);
    expect(client.getQueryData<MarketplaceApp[]>(keys.marketplaceApps())?.map((a) => a.installation?.status ?? null)).toEqual(["ACTIVE", null]);

    (apiClient.delete as jest.Mock).mockResolvedValue({ ...installation, status: "CANCELLED" });
    const uninstall = renderHook(() => useMarketplaceAppAction("uninstall"), { wrapper });
    await uninstall.result.current.mutateAsync(1);
    expect((apiClient.delete as jest.Mock).mock.calls[0]?.[0]).toBe("/billing/marketplace/1/install");
    expect(client.getQueryData<MarketplaceApp[]>(keys.marketplaceApps())?.[0]?.installation?.status).toBe("CANCELLED");
  });
});
