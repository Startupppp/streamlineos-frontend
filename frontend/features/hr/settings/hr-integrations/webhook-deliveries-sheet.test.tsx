import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { WebhookDeliveriesSheet } from "./webhook-deliveries-sheet";
import type { HrWebhookSubscription } from "@/types/hr/webhooks";

const HOOKS = join(process.cwd(), "hooks/api/hr/hr-webhooks.ts");

const deliveries = jest.fn();
const refetch = jest.fn();
const access = jest.fn(() => "granted");

jest.mock("@/hooks/api/hr/hr-webhooks", () => ({
  useHrWebhookDeliveries: () => deliveries(),
  useRedeliverHrWebhook: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCanState: () => access(),
}));

const subscription: HrWebhookSubscription = {
  id: 3,
  orgId: "org-1",
  name: "Payroll sink",
  url: "https://example.test/hook",
  events: [],
  isActive: true,
  createdBy: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function noop(): void {}

function renderSheet() {
  return render(
    <WebhookDeliveriesSheet open onOpenChange={noop} subscription={subscription} />,
  );
}

function failing() {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    error: new ApiError("Internal server error", 500),
    refetch,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  access.mockReturnValue("granted");
  deliveries.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    error: null,
    refetch,
  });
});

describe("HRMS-B3-013 an unreadable delivery log must not read as nothing having been sent", () => {
  it("keeps the failed deliveries read inline instead of throwing it to the /hr boundary", () => {
    const source = readFileSync(HOOKS, "utf8");

    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
    expect(source).toContain("...INLINE_READ_ERROR,");
  });

  it("carries the failure on the sheet itself, not only in a toast that can be missed", () => {
    deliveries.mockReturnValue(failing());
    renderSheet();

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load deliveries/i);
  });

  it("claims nothing about what was delivered while the read is erroring", () => {
    deliveries.mockReturnValue(failing());
    renderSheet();

    expect(screen.queryByText(/no deliveries yet/i)).toBeNull();
    expect(screen.queryByText(/use the test button/i)).toBeNull();
  });

  it("retries the deliveries read itself rather than reloading the integrations route", () => {
    deliveries.mockReturnValue(failing());
    renderSheet();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("says access is restricted, not empty, when hr:integrations:manage is denied (FE-49)", () => {
    access.mockReturnValue("denied");
    renderSheet();

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.queryByText(/no deliveries yet/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
  });

  it("still shows the honest empty log, with its next step, when nothing really has been sent", () => {
    renderSheet();

    expect(screen.getByText(/no deliveries yet/i)).toBeInTheDocument();
    expect(screen.getByText(/use the test button/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("still lists a delivery that was read successfully", () => {
    deliveries.mockReturnValue({
      data: [
        {
          id: 11,
          event: "employee.created",
          status: "delivered",
          responseStatus: 200,
          error: null,
          attempts: 1,
          lastAttemptAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch,
    });
    renderSheet();

    expect(screen.getByText("employee.created")).toBeInTheDocument();
    expect(screen.queryByText(/no deliveries yet/i)).toBeNull();
  });
});

describe("the failed read's request id is quotable to support", () => {
  it("renders the copyable reference the backend echoed on the error envelope", () => {
    deliveries.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new ApiError("Internal server error", 500, undefined, { correlationId: "req-abc123" }),
      refetch,
    });
    renderSheet();
    expect(screen.getByText(/reference/i)).toBeInTheDocument();
    expect(screen.getByText("req-abc123")).toBeInTheDocument();
  });
});
