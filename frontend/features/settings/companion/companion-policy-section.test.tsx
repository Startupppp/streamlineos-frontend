import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-envelope";
import { apiClient } from "@/lib/api-client";
import { CompanionPolicySection } from "./companion-policy-section";

let allowed = true;

jest.mock("@/hooks/api/access", () => ({
  useCan: () => allowed,
  usePermissionGate: (permission: string) => ({
    permission,
    allowed,
    denied: !allowed,
    pending: false,
    unavailable: false,
  }),
  useAccess: () => ({
    data: { isOrgOwner: false, scopes: allowed ? { "ai:companion:manage": "org" } : {} },
    refetch: jest.fn(),
  }),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const get = jest.mocked(apiClient.get);
const patch = jest.mocked(apiClient.patch);

const policy = {
  petEnabled: true,
  allowedPresets: ["default", "dusk", "meadow", "ember", "mono"],
  prompts: { meeting: true, clockIn: true, break: true, friendly: true },
  version: 7,
};

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return render(<CompanionPolicySection />, { wrapper: Wrapper });
}

function policyReads() {
  return get.mock.calls.filter(([url]) => url === "/companion/policy").length;
}

beforeEach(() => {
  jest.clearAllMocks();
  allowed = true;
  get.mockResolvedValue(policy);
});

describe("companion policy", () => {
  it("loads the policy for an admin who may manage the companion", async () => {
    renderSection();
    expect(await screen.findByRole("switch", { name: "Show the companion character to members" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Save companion policy" })).toBeInTheDocument();
    expect(policyReads()).toBe(1);
  });

  it("never reads the policy without the manage permission", async () => {
    allowed = false;
    renderSection();
    await waitFor(() => expect(screen.getByText("Companion")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Save companion policy" })).not.toBeInTheDocument();
    expect(policyReads()).toBe(0);
  });

  it("saves turned-off prompts and appearances with the loaded version", async () => {
    patch.mockResolvedValue({ ...policy, prompts: { ...policy.prompts, friendly: false }, version: 8 });
    const user = userEvent.setup();
    renderSection();
    await user.click(await screen.findByRole("switch", { name: "Allow friendly check-ins" }));
    await user.click(screen.getByRole("checkbox", { name: "Ember" }));
    await user.click(screen.getByRole("button", { name: "Save companion policy" }));
    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patch.mock.calls[0]?.[0]).toBe("/companion/policy");
    expect(patch.mock.calls[0]?.[1]).toEqual({
      version: 7,
      petEnabled: true,
      allowedPresets: ["default", "dusk", "meadow", "mono"],
      prompts: { meeting: true, clockIn: true, break: true, friendly: false },
    });
    expect(toast.success).toHaveBeenCalledWith("Companion policy saved");
  });

  it("refuses to save with every appearance disallowed", async () => {
    get.mockResolvedValue({ ...policy, allowedPresets: ["default"] });
    const user = userEvent.setup();
    renderSection();
    await user.click(await screen.findByRole("checkbox", { name: "Default" }));
    await user.click(screen.getByRole("button", { name: "Save companion policy" }));
    expect(await screen.findByText("Allow at least one appearance")).toBeInTheDocument();
    expect(patch).not.toHaveBeenCalled();
  });

  it("reloads the latest policy when another admin saved first", async () => {
    patch.mockRejectedValue(new ApiError("Stale version", 409, "CONFLICT"));
    const user = userEvent.setup();
    renderSection();
    await user.click(await screen.findByRole("button", { name: "Save companion policy" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Another admin changed this policy. The latest values are loaded."),
    );
    await waitFor(() => expect(policyReads()).toBe(2));
  });
});
