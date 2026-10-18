import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { NotificationPreferencesPage } from "./preferences-page";

const mockUpdate = jest.fn();

jest.mock("@/hooks/api/notifications-preferences", () => ({
  useNotificationPreferences: () => ({
    data: {
      inAppEnabled: true,
      emailEnabled: true,
      pushEnabled: false,
      smsEnabled: false,
      whatsappEnabled: false,
      soundEnabled: true,
      quietHoursStart: null,
      quietHoursEnd: null,
      digestMode: "disabled",
      categories: {},
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useUpdateNotificationPreferences: () => ({ mutate: mockUpdate, isPending: false }),
  useSuppressions: () => ({ data: [], isLoading: false }),
  useRemoveSuppression: () => ({ mutate: jest.fn(), isPending: false }),
  useResetNotificationPreferences: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/features/notifications/components/push-permission-card", () => ({ PushPermissionCard: () => null }));
jest.mock("@/features/notifications/components/preference-events-section", () => ({ PreferenceEventsSection: () => null }));
jest.mock("@/features/notifications/components/preference-scope-rules-section", () => ({ PreferenceScopeRulesSection: () => null }));
jest.mock("@/features/notifications/components/preference-consents-section", () => ({ PreferenceConsentsSection: () => null }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

function rowOf(switchName: string): HTMLElement {
  const control = screen.getByRole("switch", { name: switchName });
  const row = control.closest("div.flex.items-center.justify-between");
  if (!(row instanceof HTMLElement)) throw new Error(`no row for ${switchName}`);
  return row;
}

beforeEach(() => {
  mockUpdate.mockReset();
  mockUpdate.mockImplementation((_input: unknown, options?: { onSuccess?: () => void }) => options?.onSuccess?.());
});

describe("notification toggles confirm each save inline", () => {
  it("shows Saved beside the channel toggle that was saved, and only there", async () => {
    render(<NotificationPreferencesPage />);
    await userEvent.click(screen.getByRole("switch", { name: "Email" }));
    expect(mockUpdate).toHaveBeenCalledWith({ emailEnabled: false }, expect.any(Object));
    expect(within(rowOf("Email")).getByRole("status")).toHaveTextContent("Saved");
    expect(within(rowOf("Sound")).getByRole("status")).toHaveTextContent("");
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("confirms a category toggle that used to save silently", async () => {
    render(<NotificationPreferencesPage />);
    await userEvent.click(screen.getByRole("switch", { name: "Security" }));
    expect(mockUpdate).toHaveBeenCalledWith({ categories: { SECURITY: false } }, expect.any(Object));
    expect(within(rowOf("Security")).getByRole("status")).toHaveTextContent("Saved");
  });

  it("clears the confirmation after a moment", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<NotificationPreferencesPage />);
    await user.click(screen.getByRole("switch", { name: "Email" }));
    expect(within(rowOf("Email")).getByRole("status")).toHaveTextContent("Saved");
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(within(rowOf("Email")).getByRole("status")).toHaveTextContent("");
    jest.useRealTimers();
  });

  it("shows no Saved when the save fails", async () => {
    mockUpdate.mockImplementation((_input: unknown, options?: { onError?: (e: Error) => void }) =>
      options?.onError?.(new Error("nope")),
    );
    render(<NotificationPreferencesPage />);
    await userEvent.click(screen.getByRole("switch", { name: "Email" }));
    expect(within(rowOf("Email")).getByRole("status")).toHaveTextContent("");
    expect(toast.error).toHaveBeenCalled();
  });
});
