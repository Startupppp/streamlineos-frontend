import { render } from "@testing-library/react";
import { useEventAttendees } from "@/hooks/api/calendar";
import { useHrCalendarEventsMapped } from "./use-hr-calendar-events";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useModuleEnabled: jest.fn(),
}));

let lastQueryEnabled: boolean | undefined;

jest.mock("@tanstack/react-query", () => {
  const actual = jest.requireActual<object>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: jest.fn((opts: { enabled?: boolean }) => {
      lastQueryEnabled = opts.enabled;
      return { data: undefined, isError: false, error: null };
    }),
  };
});

const { useCan, useModuleEnabled } = jest.requireMock<{
  useCan: jest.Mock;
  useModuleEnabled: jest.Mock;
}>("@/hooks/api/access");

beforeEach(() => {
  lastQueryEnabled = undefined;
  useCan.mockReturnValue(false);
  useModuleEnabled.mockReturnValue(false);
});

// ── useEventAttendees ────────────────────────────────────────────────────────

function AttendeesHook({ eventId }: { eventId: number | null }) {
  useEventAttendees(eventId);
  return null;
}

describe("useEventAttendees — calendar:read gate", () => {
  it("is disabled when useCan('calendar:read') returns false", () => {
    useCan.mockReturnValue(false);
    render(<AttendeesHook eventId={1} />);
    expect(lastQueryEnabled).toBe(false);
  });

  it("is enabled when useCan('calendar:read') returns true and eventId is not null", () => {
    useCan.mockReturnValue(true);
    render(<AttendeesHook eventId={42} />);
    expect(lastQueryEnabled).toBe(true);
  });

  it("is disabled when eventId is null even if the permission is granted", () => {
    useCan.mockReturnValue(true);
    render(<AttendeesHook eventId={null} />);
    expect(lastQueryEnabled).toBe(false);
  });
});

// ── useHrCalendarEventsMapped ────────────────────────────────────────────────

function HrHook() {
  useHrCalendarEventsMapped(new Date("2026-09-01"), new Date("2026-09-30"), true);
  return null;
}

describe("useHrCalendarEventsMapped — hr:helpdesk:view + module gate", () => {
  it("does not fire when useCan('hr:helpdesk:view') returns false", () => {
    useCan.mockReturnValue(false);
    useModuleEnabled.mockReturnValue(true);
    render(<HrHook />);
    expect(lastQueryEnabled).toBe(false);
  });

  it("does not fire when the hr module is disabled", () => {
    useCan.mockReturnValue(true);
    useModuleEnabled.mockReturnValue(false);
    render(<HrHook />);
    expect(lastQueryEnabled).toBe(false);
  });

  it("fires when both permission and module are enabled and hrVisible is true", () => {
    useCan.mockReturnValue(true);
    useModuleEnabled.mockReturnValue(true);
    render(<HrHook />);
    expect(lastQueryEnabled).toBe(true);
  });
});
