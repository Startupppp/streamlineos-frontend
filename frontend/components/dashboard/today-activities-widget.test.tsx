import { render, screen } from "@testing-library/react";
import { TodayActivitiesWidget } from "./today-activities-widget";

type CanState = "granted" | "denied" | "loading";

const canStateRef = { current: "granted" as CanState };

const queryRef = {
  data: undefined as { type: string | null; subject: string | null }[] | undefined,
  isLoading: false,
  error: null as Error | null,
  refetch: jest.fn(),
};

jest.mock("@/hooks/api/access", () => ({
  useCanState: () => canStateRef.current,
}));

jest.mock("@/hooks/api/dashboard", () => ({
  useTodayActivities: () => queryRef,
}));

beforeEach(() => {
  canStateRef.current = "granted";
  queryRef.data = undefined;
  queryRef.isLoading = false;
  queryRef.error = null;
  queryRef.refetch.mockClear();
});

describe("TodayActivitiesWidget — denial renders NoPermissionState, never empty", () => {
  it("renders NoPermissionState when access is denied", () => {
    canStateRef.current = "denied";
    render(<TodayActivitiesWidget />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText(/No activities/i)).not.toBeInTheDocument();
  });

  it("renders the permission key so the user knows what to request", () => {
    canStateRef.current = "denied";
    render(<TodayActivitiesWidget />);
    expect(screen.getByText("crm:leads:view")).toBeInTheDocument();
  });

  it("positive control — permitted user never sees NoPermissionState", () => {
    canStateRef.current = "granted";
    queryRef.data = [{ type: "Call", subject: "Acme follow-up" }];
    render(<TodayActivitiesWidget />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("TodayActivitiesWidget — does not fire query when denied", () => {
  it("denial path mounts the widget without calling useTodayActivities in a firing state", () => {
    canStateRef.current = "denied";
    render(<TodayActivitiesWidget />);
    expect(queryRef.refetch).not.toHaveBeenCalled();
  });
});

describe("TodayActivitiesWidget — states", () => {
  it("renders a loading skeleton while access is loading", () => {
    canStateRef.current = "loading";
    queryRef.isLoading = false;
    render(<TodayActivitiesWidget />);
    expect(screen.queryByText(/No activities/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders activities when permitted and data arrives", () => {
    canStateRef.current = "granted";
    queryRef.data = [
      { type: "Call", subject: "Acme follow-up" },
      { type: "Meeting", subject: null },
    ];
    render(<TodayActivitiesWidget />);
    expect(screen.getByText("Acme follow-up")).toBeInTheDocument();
    expect(screen.getByText("Untitled")).toBeInTheDocument();
    expect(screen.getByText("Call")).toBeInTheDocument();
  });

  it("renders the empty state when permitted but no data", () => {
    canStateRef.current = "granted";
    queryRef.data = [];
    render(<TodayActivitiesWidget />);
    expect(screen.getByText(/No activities scheduled for today/i)).toBeInTheDocument();
  });

  it("renders an error alert when the query fails", () => {
    canStateRef.current = "granted";
    queryRef.error = new Error("CRM service is down");
    render(<TodayActivitiesWidget />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("CRM service is down");
  });
});
