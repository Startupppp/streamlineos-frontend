import { useEffect, type ReactNode } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/lib/api-envelope";
import { apiClient } from "@/lib/api-client";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { AskOsContext, useAskOsState } from "./ask-os-context";
import { AskOsLauncher } from "./ask-os-launcher";
import { AskOsCompanionStateContext, type AskOsCompanionState } from "./ask-os-companion-state";

const push = jest.fn();
const HEARTBEAT_TEST_INTERVAL = 60_000;

jest.mock("next-auth/react", () => ({ useSession: () => ({ status: "authenticated" }) }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
jest.mock("@/components/brand/animated-logo", () => ({ AnimatedLogo: () => <span /> }));
jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const get = jest.mocked(apiClient.get);
const post = jest.mocked(apiClient.post);
const patch = jest.mocked(apiClient.patch);

const basePreferences = {
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
const basePolicy = {
  petEnabled: true,
  allowedPresets: ["default", "dusk", "meadow", "ember", "mono"],
  prompts: { meeting: true, clockIn: true, break: true, friendly: true },
  version: 1,
};
const meetingPrompt = {
  id: "p1",
  category: "meeting",
  title: "Design review in 10 minutes",
  body: "Your calendar has an event starting soon.",
  reasonCode: "calendar.reminder",
  reason: "Your meeting reminder is on for this event.",
  sourceRef: { type: "calendarEvent", id: "e1" },
  href: "/calendar/events/e1",
  status: "eligible",
  eligibleAt: "2026-10-09T09:50:00.000Z",
  expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
  snoozedUntil: null,
};

interface ServerSetup {
  preferences?: Partial<typeof basePreferences>;
  policy?: Partial<typeof basePolicy>;
  prefsFail?: boolean;
  prompt?: typeof meetingPrompt | null;
  claimConflict?: boolean;
  claimFailure?: boolean;
}

function server({ preferences, policy, prefsFail, prompt = null, claimConflict, claimFailure }: ServerSetup = {}) {
  let conflictSeen = false;
  let resolved = false;
  get.mockImplementation((url: string) => {
    if (url === "/companion/preferences") {
      if (prefsFail) return Promise.reject(new ApiError("Unavailable", 503, "SERVICE_UNAVAILABLE"));
      return Promise.resolve({
        preferences: { ...basePreferences, ...preferences },
        locks: {},
        policy: { ...basePolicy, ...policy },
      });
    }
    if (url === "/companion/prompts/next") return Promise.resolve({ prompt: conflictSeen || resolved ? null : prompt });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
  post.mockImplementation((url: string) => {
    if (url.endsWith("/claim") && claimFailure)
      return Promise.reject(new ApiError("Unavailable", 503, "SERVICE_UNAVAILABLE"));
    if (url.endsWith("/claim") && claimConflict) {
      conflictSeen = true;
      return Promise.reject(new ApiError("Claimed", 409, "CONFLICT"));
    }
    if (url.endsWith("/dismiss") || url.endsWith("/snooze")) resolved = true;
    return Promise.resolve({ prompt: { ...meetingPrompt, status: "claimed" } });
  });
  patch.mockImplementation(() =>
    Promise.resolve({ preferences: { ...basePreferences, visible: false, version: 4 }, locks: {}, policy: basePolicy }),
  );
}

const harness: { current: ReturnType<typeof useAskOsState> | null } = { current: null };

function Harness({ activity = "idle", voice }: { activity?: AskOsCompanionState; voice?: boolean }) {
  const state = useAskOsState();
  useEffect(() => {
    harness.current = state;
  });
  return (
    <AskOsContext.Provider value={state}>
      <AskOsCompanionStateContext value={activity}>
        <AskOsLauncher
          onVoiceStart={voice ? jest.fn() : undefined}
          onVoiceDismiss={voice ? jest.fn() : undefined}
          onVoiceReview={voice ? jest.fn() : undefined}
          voiceState={voice ? "listening" : "idle"}
          voiceSupported={voice}
          voiceOverlayOpen={voice}
          voiceMessage={voice ? "Listening… tap the microphone when you are done." : null}
        />
      </AskOsCompanionStateContext>
    </AskOsContext.Provider>
  );
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

function renderLauncher(activity?: AskOsCompanionState, voice = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return { ...render(<Harness activity={activity} voice={voice} />, { wrapper: Wrapper }), client };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(document, "hasFocus").mockReturnValue(true);
  window.localStorage.clear();
  window.localStorage.setItem("unscoped::companion-intro-seen", "1");
});

afterEach(() => {
  jest.useRealTimers();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("companion launcher rollback", () => {
  it("keeps the Ask OS launcher when the preferences request fails", async () => {
    server({ prefsFail: true });
    renderLauncher();
    await settle();
    expect(get).toHaveBeenCalledWith("/companion/preferences", undefined, expect.anything(), expect.anything());
    expect(screen.getByRole("button", { name: "Open Ask OS assistant" })).toBeInTheDocument();
    expect(screen.queryByTestId("companion-character")).not.toBeInTheDocument();
  });

  it("keeps the Ask OS launcher when the organization turns the pet off", async () => {
    server({ policy: { petEnabled: false } });
    renderLauncher();
    await settle();
    expect(await screen.findByRole("button", { name: "Open Ask OS assistant" })).toBeInTheDocument();
    expect(screen.queryByTestId("companion-character")).not.toBeInTheDocument();
  });

  it("keeps the Ask OS launcher when the user hid the pet", async () => {
    server({ preferences: { visible: false } });
    renderLauncher();
    await settle();
    expect(screen.getByRole("button", { name: "Open Ask OS assistant" })).toBeInTheDocument();
  });

  it("shows the named companion with a text status when enabled", async () => {
    server();
    renderLauncher("thinking");
    expect(await screen.findByRole("button", { name: "Open Pip, Working" })).toBeInTheDocument();
    expect(screen.getByText("Working")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Open Ask OS assistant" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Pip, Working" })).toHaveClass("min-h-11");
  });

  it("resumes its ready status when a prompt pause expires", async () => {
    server({ preferences: { pausedUntil: new Date(Date.now() + 500).toISOString() } });
    renderLauncher();
    expect(await screen.findByRole("button", { name: "Open Pip, Prompts paused" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Open Pip, Ready" })).toBeInTheDocument();
  });
});

describe("companion motion", () => {
  it("keeps a distinct proposal expression when motion is disabled", async () => {
    server({ preferences: { animation: "off" } });
    renderLauncher("proposal-ready");
    const character = await screen.findByTestId("companion-character");
    expect(character).toHaveAttribute("data-state", "proposal");
    expect(character.querySelector('[data-expression="proposal"]')).toBeInTheDocument();
  });

  it("stops decorative motion for reduced-motion users and for animation off", async () => {
    server({ preferences: { animation: "off" } });
    renderLauncher();
    const character = await screen.findByTestId("companion-character");
    expect(character).toHaveAttribute("data-animation", "off");
    expect(character).toHaveAttribute("aria-hidden", "true");
    expect(character.querySelector("style")).not.toBeInTheDocument();
  });

  it("pauses while the tab is hidden", async () => {
    server();
    renderLauncher();
    const character = await screen.findByTestId("companion-character");
    expect(character).toHaveAttribute("data-paused", "false");
    const visibility = jest.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(character).toHaveAttribute("data-paused", "true");
    visibility.mockRestore();
  });
});

describe("companion activity timing", () => {
  it("does not count time while the window is blurred", async () => {
    jest.useFakeTimers();
    const focus = jest.spyOn(document, "hasFocus").mockReturnValue(true);
    server({ preferences: { activityConsent: true } });
    renderLauncher();
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    focus.mockReturnValue(false);
    act(() => window.dispatchEvent(new Event("blur")));
    act(() => jest.advanceTimersByTime(HEARTBEAT_TEST_INTERVAL));
    expect(post.mock.calls.some(([url]) => url === "/companion/activity/heartbeat")).toBe(false);

    focus.mockReturnValue(true);
    act(() => window.dispatchEvent(new Event("focus")));
    act(() => jest.advanceTimersByTime(HEARTBEAT_TEST_INTERVAL));
    await act(async () => Promise.resolve());
    expect(post.mock.calls.some(([url]) => url === "/companion/activity/heartbeat")).toBe(true);
    focus.mockRestore();
  });
});

describe("companion keyboard focus", () => {
  it("shows a small listening caption above the pet while chat stays closed", async () => {
    server();
    renderLauncher("idle", true);
    expect(await screen.findByText("Listening to you")).toBeInTheDocument();
    expect(screen.getByText("Listening… tap the microphone when you are done.")).toBeInTheDocument();
    expect(harness.current?.open).toBe(false);
  });
  it("opens from the keyboard and returns focus to the pet when the panel closes", async () => {
    server();
    const user = userEvent.setup();
    renderLauncher();
    const button = await screen.findByRole("button", { name: "Open Pip, Ready" });
    button.focus();
    await user.keyboard("{Enter}");
    expect(harness.current?.open).toBe(true);
    act(() => {
      button.blur();
      harness.current?.setOpen(false);
    });
    await waitFor(() => expect(screen.getByRole("button", { name: "Open Pip, Ready" })).toHaveFocus());
  });
});

describe("companion first visit", () => {
  it("offers Ask, Customize and Hide without asking for a name", async () => {
    window.localStorage.clear();
    server();
    const user = userEvent.setup();
    renderLauncher();
    const intro = await screen.findByRole("dialog", { name: "Meet Pip" });
    expect(intro).toHaveTextContent("Ask");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Hide" }));
    expect(patch).toHaveBeenCalledWith("/companion/preferences", { version: 3, visible: false }, undefined, expect.anything());
    expect(window.localStorage.getItem("unscoped::companion-intro-seen")).toBe("1");
  });

  it("opens the assistant from Ask", async () => {
    window.localStorage.clear();
    server();
    const user = userEvent.setup();
    renderLauncher();
    await user.click(await screen.findByRole("button", { name: "Ask" }));
    expect(harness.current?.open).toBe(true);
    expect(screen.queryByRole("dialog", { name: "Meet Pip" })).not.toBeInTheDocument();
  });
});

describe("companion prompt bubble", () => {
  it("defers claiming while another modal owns the user's attention", async () => {
    const modal = document.createElement("div");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    document.body.appendChild(modal);
    server({ prompt: meetingPrompt });
    renderLauncher();
    await settle();
    expect(post).not.toHaveBeenCalledWith("/companion/prompts/p1/claim", undefined, undefined, expect.anything());
    modal.remove();
    expect(await screen.findByText("Design review in 10 minutes")).toBeInTheDocument();
  });

  it("shows a prompt only after this tab claims it", async () => {
    server({ prompt: meetingPrompt });
    renderLauncher();
    expect(await screen.findByText("Design review in 10 minutes")).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith("/companion/prompts/p1/claim", undefined, undefined, expect.anything());
  });

  it("keeps this tab's claimed prompt visible when the next candidate changes", async () => {
    server({ prompt: meetingPrompt });
    const { client } = renderLauncher();
    await screen.findByText("Design review in 10 minutes");
    act(() => {
      client.setQueryData(collaborationQueryKeys.companion.nextPrompt(), { prompt: null });
    });
    expect(screen.getByText("Design review in 10 minutes")).toBeInTheDocument();
  });

  it("drops the prompt silently when another tab already claimed it", async () => {
    server({ prompt: meetingPrompt, claimConflict: true });
    renderLauncher();
    await waitFor(() => expect(post).toHaveBeenCalledWith("/companion/prompts/p1/claim", undefined, undefined, expect.anything()));
    expect(screen.queryByText("Design review in 10 minutes")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Companion suggestion" })).not.toBeInTheDocument();
    await waitFor(() =>
      expect(get.mock.calls.filter(([url]) => url === "/companion/prompts/next").length).toBeGreaterThan(1),
    );
  });

  it("does not retry a failed claim in a tight loop", async () => {
    server({ prompt: meetingPrompt, claimFailure: true });
    renderLauncher();
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    await settle();
    expect(post).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("region", { name: "Companion suggestion" })).not.toBeInTheDocument();
  });

  it("explains why, then dismisses", async () => {
    server({ prompt: meetingPrompt });
    const user = userEvent.setup();
    renderLauncher();
    await user.click(await screen.findByRole("button", { name: "Why this prompt?" }));
    expect(screen.getByText("Your meeting reminder is on for this event.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Dismiss suggestion" }));
    expect(post).toHaveBeenCalledWith("/companion/prompts/p1/dismiss", undefined, undefined, expect.anything());
    await waitFor(() => expect(screen.queryByText("Design review in 10 minutes")).not.toBeInTheDocument());
  });

  it("snoozes for the chosen minutes", async () => {
    server({ prompt: meetingPrompt });
    const user = userEvent.setup();
    renderLauncher();
    await user.click(await screen.findByRole("button", { name: "Snooze" }));
    await user.click(screen.getByRole("button", { name: "15 min" }));
    expect(post).toHaveBeenCalledWith("/companion/prompts/p1/snooze", { minutes: 15 }, undefined, expect.anything());
    await waitFor(() => expect(screen.queryByText("Design review in 10 minutes")).not.toBeInTheDocument());
  });

  it("stays out of the way while the panel is open", async () => {
    server({ prompt: meetingPrompt });
    const user = userEvent.setup();
    renderLauncher();
    await screen.findByText("Design review in 10 minutes");
    await user.click(screen.getByRole("button", { name: "Open Pip, Ready" }));
    expect(screen.queryByText("Design review in 10 minutes")).not.toBeInTheDocument();
  });

  it("restores this tab's claimed prompt after the panel closes", async () => {
    server({ prompt: meetingPrompt });
    const user = userEvent.setup();
    renderLauncher();
    await screen.findByText("Design review in 10 minutes");
    await user.click(screen.getByRole("button", { name: "Open Pip, Ready" }));
    expect(screen.queryByText("Design review in 10 minutes")).not.toBeInTheDocument();
    act(() => harness.current?.setOpen(false));
    expect(await screen.findByText("Design review in 10 minutes")).toBeInTheDocument();
    expect(post.mock.calls.filter(([url]) => String(url).endsWith("/claim"))).toHaveLength(1);
  });
});
