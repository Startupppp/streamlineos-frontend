import { act, render } from "@testing-library/react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-envelope";
import type { IntegrationConnection } from "@/hooks/api/integrations";
import type { EventCreateForm } from "./event-create-form";
import { EventCreateDialog } from "./event-create-dialog";

type FormProps = Parameters<typeof EventCreateForm>[0];

let mockConnections: IntegrationConnection[] | undefined;
const mockCreate = jest.fn();
let lastProps: FormProps | null = null;
let mockRenderCount = 0;

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }));
jest.mock("@/hooks/common/use-mobile", () => ({ useIsMobile: () => false }));
jest.mock("./use-calendar-connections", () => ({
  useCalendarConnections: () => ({ data: mockConnections }),
}));
jest.mock("@/hooks/api/calendar", () => ({
  useCreateCalendarEvent: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateCalendarEvent: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useUpsertOccurrenceException: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useCalendarMemberLookup: () => ({ data: undefined }),
  useCalendarEvent: () => ({ data: undefined }),
  useEventAttendees: () => ({ data: undefined }),
  extractEventNumericId: () => null,
}));
jest.mock("./event-create-validators", () => ({
  ...jest.requireActual("./event-create-validators"),
  validateEventTitle: () => null,
}));
jest.mock("./event-series-scope-dialog", () => ({ EventSeriesScopeDialog: () => null }));
jest.mock("./event-create-form", () => ({
  EventCreateForm: (props: FormProps) => {
    mockRenderCount += 1;
    if (mockRenderCount > 50) throw new Error("EventCreateDialog re-rendered without bound");
    lastProps = props;
    return null;
  },
}));

function connection(id: number, isPrimary: boolean): IntegrationConnection {
  return {
    id,
    isPrimary,
    status: "active",
    toolkit: "googlecalendar",
    accountEmail: null,
    accountLabel: null,
    createdAt: "2026-10-01T00:00:00Z",
  };
}

function renderDialog() {
  return render(<EventCreateDialog open onOpenChange={jest.fn()} />);
}

beforeEach(() => {
  lastProps = null;
  mockRenderCount = 0;
  mockCreate.mockReset();
  jest.clearAllMocks();
});

describe("EventCreateDialog render loop (BUG-007)", () => {
  it("renders while the connections read is pending, without exceeding update depth", () => {
    mockConnections = undefined;
    const errors = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderDialog()).not.toThrow();
    expect(errors.mock.calls.flat().join(" ")).not.toMatch(/Maximum update depth/);
    errors.mockRestore();
    expect(lastProps?.form.syncConnectionId).toBe("none");
  });

  it("defaults the sync target to 'none' and keeps an explicit connection choice", () => {
    mockConnections = [connection(4, false), connection(7, true)];
    renderDialog();
    expect(lastProps?.form.syncConnectionId).toBe("none");
    act(() => lastProps?.onSyncConnectionChange("7"));
    expect(lastProps?.form.syncConnectionId).toBe("7");
  });

  it("shows an error toast when the create times out", async () => {
    mockConnections = [];
    mockCreate.mockRejectedValue(new ApiError("Request timed out", 0));
    renderDialog();
    await act(async () => { await lastProps?.onSave({}); });
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/timed out/i));
  });
});
