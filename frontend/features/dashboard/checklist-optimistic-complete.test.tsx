import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    post: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock("@/hooks/api/authorized-mutation", () => ({
  useAuthorizedMutation: (_key: string, options: Record<string, unknown>) => {
    const { useMutation } = jest.requireActual("@tanstack/react-query") as typeof import("@tanstack/react-query");
    return useMutation(options);
  },
}));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: (fn: () => Promise<unknown>) => fn,
}));

jest.mock("@/hooks/api/onboarding-flow-schema", () => ({
  checklistProgressContract: undefined,
  moduleChecklistListContract: undefined,
  onboardingFlowSessionContract: undefined,
  guidedTourListContract: undefined,
  tourProgressRowContract: undefined,
}));

import { useCompleteChecklistItem, type ModuleChecklist } from "@/hooks/api/onboarding-flow";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { apiClient } from "@/lib/api-client";

const ITEM_KEY = "setup-chat";
const MODULE_KEY = "hr";

const CHECKLIST: ModuleChecklist[] = [
  {
    id: 1,
    moduleKey: MODULE_KEY,
    status: "in_progress",
    progress: 0,
    dismissedAt: null,
    completedAt: null,
    items: [
      {
        id: 10,
        itemKey: ITEM_KEY,
        title: "Set up chat",
        description: null,
        actionHref: null,
        status: "todo",
        required: true,
        sortOrder: 1,
      },
    ],
  },
];

function makeWrapper(qc: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe("useCompleteChecklistItem — optimistic update prevents the self-toggle flicker", () => {
  it.each(["persisted", "initial"])("updates %s items using stable module and item keys", async (state) => {
    jest.clearAllMocks();
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(
      platformCoreQueryKeys.onboardingFlow.moduleChecklists(),
      CHECKLIST.map((checklist) => ({
        ...checklist,
        id: state === "initial" ? null : checklist.id,
        items: checklist.items.map((item) => ({
          ...item,
          id: state === "initial" ? null : item.id,
        })),
      })),
    );

    const { result } = renderHook(() => useCompleteChecklistItem(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      result.current.mutate({ moduleKey: MODULE_KEY, itemKey: ITEM_KEY });
    });

    const updated = qc.getQueryData<ModuleChecklist[]>(
      platformCoreQueryKeys.onboardingFlow.moduleChecklists(),
    );
    const item = updated?.[0]?.items.find((i) => i.itemKey === ITEM_KEY);
    expect(item?.status).toBe("done");
    expect(apiClient.post).toHaveBeenCalledWith(
      `/onboarding/module-checklists/${MODULE_KEY}/items/${ITEM_KEY}/complete`,
      {},
      undefined,
      expect.any(Function),
    );
  });
});
