import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { apiClient } from "@/lib/api-client";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useOrgJobRoles } from "./hr-org";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useModuleEnabled: jest.fn(),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn() },
}));

const can = useCan as jest.Mock;
const moduleEnabled = useModuleEnabled as jest.Mock;
const get = apiClient.get as jest.Mock;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe("HRMS core query request suppression", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    get.mockResolvedValue([]);
  });

  it("makes zero requests when the HR module is disabled", async () => {
    can.mockReturnValue(true);
    moduleEnabled.mockReturnValue(false);

    renderHook(() => useOrgJobRoles(), { wrapper: createWrapper() });

    await waitFor(() => expect(get).not.toHaveBeenCalled());
    expect(can).toHaveBeenCalledWith("hr:employees:view");
    expect(moduleEnabled).toHaveBeenCalledWith("hr");
  });

  it("makes zero requests when the exact endpoint permission is denied", async () => {
    can.mockReturnValue(false);
    moduleEnabled.mockReturnValue(true);

    renderHook(() => useOrgJobRoles(), { wrapper: createWrapper() });

    await waitFor(() => expect(get).not.toHaveBeenCalled());
  });

  it("does not let caller enabled override either access gate", async () => {
    can.mockReturnValue(false);
    moduleEnabled.mockReturnValue(false);

    renderHook(() => useOrgJobRoles({ enabled: true }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(get).not.toHaveBeenCalled());
  });

  it("requests the endpoint once when module, permission and caller allow it", async () => {
    can.mockReturnValue(true);
    moduleEnabled.mockReturnValue(true);

    renderHook(() => useOrgJobRoles(), { wrapper: createWrapper() });

    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
    expect(get).toHaveBeenCalledWith("/hr/org/roles");
  });
});
