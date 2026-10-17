import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-envelope";
import { apiClient } from "@/lib/api-client";
import { CompanionPreferencesSection } from "./companion-preferences-section";

jest.mock("next-auth/react", () => ({ useSession: () => ({ status: "authenticated" }) }));
jest.mock("@/hooks/api/access", () => ({
  usePermissionGate: () => ({ permission: "ai:chat:use", allowed: true, denied: false, pending: false, unavailable: false }),
  useCan: () => true,
  useAccess: () => ({ data: { isOrgOwner: true, scopes: {} }, refetch: jest.fn() }),
}));
jest.mock("next/navigation", () => ({
  usePathname: () => window.location.pathname,
  useSearchParams: () => {
    const React = jest.requireActual<typeof import("react")>("react");
    const query = React.useSyncExternalStore(
      (notify) => { window.addEventListener("popstate", notify); return () => window.removeEventListener("popstate", notify); },
      () => window.location.search,
      () => "",
    );
    return new URLSearchParams(query);
  },
  useRouter: () => ({
    replace: (url: string) => { window.history.replaceState(null, "", url); window.dispatchEvent(new Event("popstate")); },
  }),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const get = jest.mocked(apiClient.get);
const patch = jest.mocked(apiClient.patch);

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

function serve(
  overrides: { preferences?: Partial<Omit<typeof preferences, "pausedUntil">> & { pausedUntil?: string | null }; locks?: Record<string, string> } = {},
) {
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

async function chooseOption(user: ReturnType<typeof userEvent.setup>, label: string, option: string) {
  const trigger = screen.getByRole("combobox", { name: label });
  trigger.focus();
  await user.keyboard("{Enter}");
  await user.click(screen.getByRole("option", { name: option }));
}

beforeEach(() => {
  jest.clearAllMocks();
  window.history.replaceState(null, "", "/settings");
});

function historyItem(id: string, title: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    category: "meeting",
    title,
    body: "",
    reasonCode: "meeting.upcoming",
    reason: "A meeting starts soon",
    sourceRef: null,
    href: null,
    status: "dismissed",
    eligibleAt: "2026-10-09T09:00:00.000Z",
    expiresAt: "2026-10-09T10:00:00.000Z",
    snoozedUntil: null,
    ...overrides,
  };
}

describe("companion preferences", () => {
  it("previews appearance changes and links to notification quiet hours", async () => {
    serve();
    const user = userEvent.setup();
    renderSection();
    expect(await screen.findByLabelText("Companion preview")).toHaveTextContent("Pip");
    await chooseOption(user, "Appearance", "Ember");
    expect(screen.getByTestId("companion-character")).toHaveAttribute("data-preset", "ember");
    expect(screen.getByRole("link", { name: "Manage quiet hours" })).toHaveAttribute(
      "href",
      "/settings/notifications/my-preferences",
    );
  });

  it("filters activity by category and outcome and shows source and destination", async () => {
    serve();
    const preferencesGet = get.getMockImplementation();
    get.mockImplementation((url: string, params?: unknown) => {
      if (url !== "/companion/prompts/history") return preferencesGet?.(url) ?? Promise.resolve(undefined);
      const filters = params as { status?: string } | undefined;
      const allItems = [
        historyItem("a", "Standup", {
          sourceRef: { type: "calendarEvent", id: "event-1" },
          href: "/calendar/events/event-1",
        }),
        historyItem("b", "Take a break", { category: "break", status: "suppressed" }),
      ];
      return Promise.resolve({
        items: filters?.status ? allItems.filter((item) => item.status === filters.status) : allItems,
        nextCursor: null,
      });
    });
    const user = userEvent.setup();
    renderSection();
    expect(await screen.findByText("Standup")).toBeInTheDocument();
    expect(screen.getByText("Source: calendarEvent (event-1)")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open destination" })).toHaveAttribute("href", "/calendar/events/event-1");
    await chooseOption(user, "Filter suggestion outcome", "Suppressed");
    await waitFor(() => expect(screen.queryByText("Standup")).not.toBeInTheDocument());
    expect(await screen.findByText("Take a break")).toBeInTheDocument();
    expect(window.location.search).toContain("companionOutcome=suppressed");
    expect(get).toHaveBeenCalledWith("/companion/prompts/history", { status: "suppressed" }, expect.anything(), expect.anything());
    expect(screen.getByText("Suppression reason: A meeting starts soon")).toBeInTheDocument();
  });

  it("pages prompt history by cursor", async () => {
    serve();
    const preferencesGet = get.getMockImplementation();
    get.mockImplementation((url: string, params?: unknown) => {
      if (url !== "/companion/prompts/history") return preferencesGet?.(url) ?? Promise.resolve(undefined);
      return Promise.resolve(
        !(params as { cursor?: string } | undefined)?.cursor
          ? { items: [historyItem("a", "Standup")], nextCursor: "c2" }
          : { items: [historyItem("b", "Retro")], nextCursor: null },
      );
    });
    const user = userEvent.setup();
    renderSection();
    expect(await screen.findByText("Standup")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(await screen.findByText("Retro")).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith("/companion/prompts/history", { cursor: "c2" }, expect.anything(), expect.anything());
    expect(screen.queryByText("Standup")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("reads the backend's lock keys and says why", async () => {
    serve({
      locks: {
        visible: "Turned off by your organization",
        preset: "Limited to the presets your organization allows",
        "prompts.friendly": "Turned off by your organization",
      },
    });
    renderSection();
    expect(await screen.findByLabelText("Appearance")).toBeEnabled();
    expect(screen.getByText("Limited to the presets your organization allows")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Show companion" })).toBeDisabled();
    expect(screen.getByRole("switch", { name: "Friendly check-ins" })).toBeDisabled();
    expect(screen.getByLabelText("Tone")).toBeEnabled();
    expect(screen.getByRole("switch", { name: "Missed clock-in" })).toBeDisabled();
    expect(screen.getByRole("switch", { name: "Upcoming meetings" })).toBeEnabled();
  });

  it("pauses prompts until the user resumes", async () => {
    serve();
    patch.mockResolvedValue({ preferences: { ...preferences, version: 4 }, locks: {}, policy });
    const user = userEvent.setup();
    renderSection();
    await screen.findByRole("combobox", { name: "Pause all companion prompts" });
    await chooseOption(user, "Pause all companion prompts", "Until I resume");
    await user.click(screen.getByRole("button", { name: "Save companion settings" }));
    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patch.mock.calls[0]?.[1]).toMatchObject({ pausedUntil: "2999-12-31T23:59:59.000Z" });
  });

  it("shows an indefinite pause and clears it on resume", async () => {
    serve({ preferences: { pausedUntil: "2999-12-31T23:59:59.000Z" } });
    patch.mockResolvedValue({ preferences: { ...preferences, version: 4 }, locks: {}, policy });
    const user = userEvent.setup();
    renderSection();
    const pause = await screen.findByRole("combobox", { name: "Pause all companion prompts" });
    expect(pause).toHaveTextContent("Paused until you resume");
    await chooseOption(user, "Pause all companion prompts", "Resume prompts");
    await user.click(screen.getByRole("button", { name: "Save companion settings" }));
    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(patch.mock.calls[0]?.[1]).toMatchObject({ pausedUntil: null });
  });

  it("offers explicit timing consent when enabling break or friendly prompts", async () => {
    serve();
    const user = userEvent.setup();
    renderSection();
    const friendly = await screen.findByRole("switch", { name: "Friendly check-ins" });
    expect(friendly).toBeEnabled();
    await user.click(friendly);
    expect(screen.getByRole("alertdialog", { name: "Allow activity timing?" })).toBeInTheDocument();
    expect(friendly).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: "Not now" }));
    expect(screen.getByRole("switch", { name: "Activity timing" })).not.toBeChecked();
    await user.click(friendly);
    await user.click(screen.getByRole("button", { name: "Add to settings" }));
    expect(screen.getByRole("switch", { name: "Activity timing" })).toBeChecked();
    expect(friendly).toBeChecked();
    await user.click(screen.getByRole("switch", { name: "Activity timing" }));
    expect(friendly).not.toBeChecked();
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

  it("revokes timing through the preference update without a second delete request", async () => {
    serve({ preferences: { activityConsent: true } });
    patch.mockResolvedValue({ preferences: { ...preferences, version: 4 }, locks: {}, policy });
    const user = userEvent.setup();
    renderSection();
    await user.click(await screen.findByRole("switch", { name: "Activity timing" }));
    await user.click(screen.getByRole("button", { name: "Save companion settings" }));
    await waitFor(() => expect(patch).toHaveBeenCalled());
    expect(apiClient.delete).not.toHaveBeenCalled();
    expect(patch.mock.calls[0]?.[1]).toMatchObject({ activityConsent: false });
  });
});
