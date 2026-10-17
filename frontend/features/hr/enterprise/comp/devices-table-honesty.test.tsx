import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import type { AccessState } from "@/lib/rbac/gate";
import { DevicesTable } from "./devices-table";

const devices = jest.fn();
const canState = jest.fn<AccessState, []>();

jest.mock("@/hooks/api/hr/enterprise-comp", () => ({
  useTimeDevices: () => devices(),
  useDeleteTimeDevice: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCanState: () => canState(),
}));

const OK = { isLoading: false, isFetching: false, isError: false, error: null };
const EMPTY_PAGE = { data: [], pagination: { hasMore: false, nextCursor: null } };

function renderTable() {
  return render(<DevicesTable canManage onAdd={jest.fn()} onEdit={jest.fn()} />);
}

beforeEach(() => {
  jest.clearAllMocks();
  canState.mockReturnValue("granted");
  devices.mockReturnValue({ ...OK, data: EMPTY_PAGE, refetch: jest.fn() });
});

describe("the devices table never claims no devices are registered when it could not read them", () => {
  it("says the read is refused, with no retry, when hr:biometric:manage is missing", () => {
    canState.mockReturnValue("denied");
    devices.mockReturnValue({ ...OK, data: undefined, refetch: jest.fn() });
    renderTable();

    expect(screen.getByRole("status")).toHaveTextContent(/access restricted/i);
    expect(screen.queryByText(/no time clock devices/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /register device/i })).toBeNull();
  });

  it("shows a skeleton, not an empty state, while the access snapshot is still unread", () => {
    canState.mockReturnValue("loading");
    devices.mockReturnValue({ ...OK, data: undefined, refetch: jest.fn() });
    renderTable();

    expect(screen.queryByText(/no time clock devices/i)).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("reports the failure rather than an empty device list when the read 500d", () => {
    const refetch = jest.fn();
    devices.mockReturnValue({
      ...OK,
      data: undefined,
      isError: true,
      error: new ApiError("Internal server error", 500, undefined, {
        correlationId: "req-lane-d",
      }),
      refetch,
    });
    renderTable();

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load devices/i);
    expect(screen.queryByText(/no time clock devices/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("says the list could not be determined when the read never ran and never failed", () => {
    devices.mockReturnValue({ ...OK, data: undefined, refetch: jest.fn() });
    renderTable();

    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't determine the device list/i);
    expect(screen.queryByText(/no time clock devices/i)).toBeNull();
  });

  it("still shows the honest empty state and its CTA when the read genuinely returned none", () => {
    renderTable();

    expect(screen.getByText(/no time clock devices/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /register device/i })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("still lists the devices the read returned", () => {
    devices.mockReturnValue({
      ...OK,
      data: {
        data: [
          {
            id: 1,
            name: "Gate reader",
            serialNumber: "SN-1",
            type: "biometric",
            status: "active",
            lastSyncAt: null,
          },
        ],
        pagination: { hasMore: false, nextCursor: null },
      },
      refetch: jest.fn(),
    });
    renderTable();

    expect(screen.getByText("Gate reader")).toBeInTheDocument();
    expect(screen.queryByText(/no time clock devices/i)).toBeNull();
  });

  it("opts the device read out of the /hr boundary, so the error branch above is reachable on a 500", () => {
    const source = readFileSync(
      join(process.cwd(), "hooks/api/hr/enterprise-comp.ts"),
      "utf8",
    );
    const region = source.slice(
      source.indexOf("export function useTimeDevices"),
      source.indexOf("export function useCreateTimeDevice"),
    );

    expect(INLINE_READ_ERROR).toEqual({ throwOnError: false });
    expect(region).toContain("...INLINE_READ_ERROR,");
  });
});
