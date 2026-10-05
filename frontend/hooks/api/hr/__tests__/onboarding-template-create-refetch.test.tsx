import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";

import { apiClient } from "@/lib/api-client";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCreateHrOnboardingTemplate, useHrOnboardingTemplates } from "@/hooks/api/hr/onboarding";

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useAccess: jest.fn(() => ({ data: { isOrgOwner: true, scopes: {} }, refetch: jest.fn() })),
}));

const mockedGet = apiClient.get as jest.Mock;
const mockedPost = apiClient.post as jest.Mock;

const plan = { id: 7, name: "QA Synthetic Plan", steps: [] };

describe("BUG-HRMS-021: creating an onboarding plan", () => {
  it("resolves the caller's onSuccess only after the plans list holds the new plan", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function wrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    }
    mockedGet
      .mockResolvedValueOnce([])
      // A refetch slower than the POST, as on a real network.
      .mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve([plan]), 50)));
    mockedPost.mockResolvedValue({ success: true, templateId: plan.id });

    const { result } = renderHook(
      () => ({ list: useHrOnboardingTemplates(), create: useCreateHrOnboardingTemplate() }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.list.data).toEqual([]));

    let listAtToast: unknown;
    await act(async () => {
      await result.current.create.mutateAsync(
        { name: plan.name, steps: [] },
        { onSuccess: () => { listAtToast = client.getQueryData(humanResourcesQueryKeys.hr.onboardingTemplates()); } },
      );
    });

    expect(mockedGet).toHaveBeenCalledTimes(2);
    expect(listAtToast).toEqual([plan]);
  });
});
