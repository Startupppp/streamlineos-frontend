import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { apiClient } from "@/lib/api-client";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import type { NotificationConsent } from "@/hooks/api/notifications-schema";
import { useRecordNotificationConsent } from "@/hooks/api/notifications-preferences";
import { PreferenceConsentsSection } from "./preference-consents-section";

jest.mock("next-auth/react", () => ({ useSession: () => ({ data: { orgId: "org" } }) }));
jest.mock("@/lib/api-client", () => ({ apiClient: { get: jest.fn(), put: jest.fn() } }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const GRANTED: NotificationConsent = {
  channel: "SMS",
  destination: "+919876543210",
  state: "GRANTED",
  source: "PREFERENCE_CENTRE",
  legalBasis: "CONSENT",
  grantedAt: "2026-10-01T00:00:00Z",
  withdrawnAt: null,
  updatedAt: "2026-10-01T00:00:00Z",
};

let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  (apiClient.get as jest.Mock).mockReset().mockResolvedValue([GRANTED]);
  (apiClient.put as jest.Mock).mockReset();
});

it("withdraws a granted consent for the same destination", async () => {
  (apiClient.put as jest.Mock).mockResolvedValue({ ...GRANTED, state: "WITHDRAWN", withdrawnAt: "2026-10-02T00:00:00Z" });
  render(<PreferenceConsentsSection />, { wrapper });
  await userEvent.click(await screen.findByRole("button", { name: "Withdraw" }));
  expect((apiClient.put as jest.Mock).mock.calls[0]?.[1]).toEqual({ channel: "SMS", destination: GRANTED.destination, state: "WITHDRAWN" });
  expect(await screen.findByRole("button", { name: "Grant again" })).toBeInTheDocument();
});

it("upserts the recorded row by channel and destination instead of refetching", async () => {
  client.setQueryData(platformCoreQueryKeys.notifications.consents(), [GRANTED, { ...GRANTED, destination: "+911111111111" }]);
  (apiClient.put as jest.Mock).mockResolvedValue({ ...GRANTED, state: "WITHDRAWN" });
  const { result } = renderHook(() => useRecordNotificationConsent(), { wrapper });
  await result.current.mutateAsync({ channel: "SMS", destination: GRANTED.destination, state: "WITHDRAWN" });
  const rows = client.getQueryData<NotificationConsent[]>(platformCoreQueryKeys.notifications.consents());
  expect(rows?.map((r) => `${r.destination}:${r.state}`)).toEqual(["+919876543210:WITHDRAWN", "+911111111111:GRANTED"]);
  expect(apiClient.get).not.toHaveBeenCalled();
});
