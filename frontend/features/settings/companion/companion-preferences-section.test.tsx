import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-envelope";
import { apiClient } from "@/lib/api-client";
import { CompanionPreferencesSection } from "./companion-preferences-section";

jest.mock("next-auth/react", () => ({ useSession: () => ({ status: "authenticated" }) }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const get = jest.mocked(apiClient.get);
const patch = jest.mocked(apiClient.patch);
const del = jest.mocked(apiClient.delete);

const preferences = {
  visible: true,
  name: "Pip",
  preset: "dusk",
  tone: "neutral",
  animation: "subtle",
  anchor: "bottom-right",
  prompts: { meeting: true, clockIn: false, break: false, friendly: false },
  activityConsent: false,
  pausedUntil: null,
  version: 3,
  updatedAt: "2026-10-09T00:00:00.000Z",
};
const policy = {
  petEnabled: true,
  allowedPresets: ["default", "dusk", "meadow", "ember", "mono"],
  prompts: { meeting: true, clockIn: false, break: true, friendly: true },
  version: 1,
};

function serve(overrides: { preferences?: Partial<typeof preferences>; locks?: Record<string, string> } = {}) {
  get.mockImplementation((url: string) => {
    if (url === "/companion/preferences")
      return Promise.resolve({
        preferences: { ...preferences, ...overrides.preferences },
        locks: overrides.locks ?? {},
        policy,
      });
    return Promise.resolve({ items: [], nextCursor: null });
  });
}

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return render(<CompanionPreferencesSection />, { wrapper: Wrapper });
}

function preferenceReads() {
  return get.mock.calls.filter(([url]) => url === "/companion/preferences").length;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("companion preferences", () => {
  it("disables admin-locked settings and says why", async () => {
    serve({ locks: { preset: "Set by your organization" } });
    renderSection();
    expect(await screen.findByLabelText("Appearance")).toBeDisabled();
    expect(screen.getByText("Set by your organization")).toBeInTheDocument();
    expect(screen.getByLabelText("Tone")).toBeEnabled();
    expect(screen.getByRole("switch", { name: "Missed clock-in" })).toBeDisabled();
    expect(screen.getByText("Turned off by your organization")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Upcoming meetings" })).toBeEnabled();
  });

  it("keeps break and friendly prompts off until activity timing is allowed", async () => {
    serve();
    const user = userEvent.setup();
    renderSection();
    const friendly = await screen.findByRole("switch", { name: "Friendly check-ins" });
    expect(friendly).toBeDisabled();
    await user.click(screen.getByRole("switch", { name: "Activity timing" }));
    expect(friendly).toBeEnabled();
  });

  it("saves with the loaded version", async () => {
    serve();
    patch.mockResolvedValue({ preferences: { ...preferences, name: "Nova", version: 4 }, locks: {}, policy });
    const user = userEvent.setup();
    renderSection();
    const name = await screen.findByLabelText("Name");
    await user.clear(name);
    await user.type(name, "Nova");
    await user.click(screen.getByRole("button", { name: "Save companion settings" }));
    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patch.mock.calls[0]?.[1]).toMatchObject({ version: 3, name: "Nova", pausedUntil: null });
    expect(toast.success).toHaveBeenCalledWith("Companion settings saved");
    expect(del).not.toHaveBeenCalled();
  });

  it("reloads the latest settings when another device saved first", async () => {
    serve();
    patch.mockRejectedValue(new ApiError("Stale version", 409, "CONFLICT"));
    const user = userEvent.setup();
    renderSection();
    await user.click(await screen.findByRole("button", { name: "Save companion settings" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("These settings changed somewhere else. The latest values are loaded."),
    );
    await waitFor(() => expect(preferenceReads()).toBe(2));
  });

  it("deletes activity timing when consent is revoked", async () => {
    serve({ preferences: { activityConsent: true } });
    patch.mockResolvedValue({ preferences: { ...preferences, version: 4 }, locks: {}, policy });
    del.mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderSection();
    await user.click(await screen.findByRole("switch", { name: "Activity timing" }));
    await user.click(screen.getByRole("button", { name: "Save companion settings" }));
    await waitFor(() => expect(del).toHaveBeenCalledWith("/companion/activity", undefined, undefined, expect.anything()));
    expect(patch.mock.calls[0]?.[1]).toMatchObject({ activityConsent: false });
  });
});
