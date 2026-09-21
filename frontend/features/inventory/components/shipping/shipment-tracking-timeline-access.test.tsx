import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { ShipmentTrackingTimeline } from "./shipment-tracking-timeline";
import type { AccessState } from "@/lib/rbac/gate";
import type { ShipmentTimeline } from "@/hooks/api/inventory/shipping";

let mockState: AccessState = "loading";

jest.mock("@/hooks/api/access", () => ({
  useCanState: () => mockState,
}));

const STUB_TIMELINE: ShipmentTimeline = {
  shipment: { id: 11, status: "IN_TRANSIT", trackingNumber: "TRACK123" },
  events: [
    {
      id: 1,
      status: "IN_TRANSIT",
      occurredAt: "2026-09-10T08:00:00.000Z",
      receivedAt: "2026-09-10T08:05:00.000Z",
      description: "Shipment picked up by carrier",
    },
  ],
};

const mockRefetch = jest.fn();

jest.mock("@/hooks/api/inventory/shipping", () => ({
  useShipmentTimeline: () => ({
    data: STUB_TIMELINE,
    isPending: false,
    isError: false,
    error: null,
    refetch: mockRefetch,
  }),
  useRefreshShipmentTracking: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("./carrier-status-dialog", () => ({
  CarrierStatusDialog: () => null,
}));

afterEach(() => jest.clearAllMocks());

const TRACKING_NUMBER = "TRACK123";

describe("ShipmentTrackingTimeline – access gate", () => {
  it("shows Refresh and Record update controls when access is granted", () => {
    mockState = "granted";
    renderWithProviders(
      <ShipmentTrackingTimeline shipmentId={11} trackingNumber={TRACKING_NUMBER} />,
    );
    expect(screen.getByRole("button", { name: /Refresh/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Record update/i })).toBeInTheDocument();
    expect(screen.queryByText(/Access Restricted/i)).not.toBeInTheDocument();
  });

  it("hides controls and shows the denial notice when access is denied", () => {
    mockState = "denied";
    renderWithProviders(
      <ShipmentTrackingTimeline shipmentId={11} trackingNumber={TRACKING_NUMBER} />,
    );
    expect(screen.queryByRole("button", { name: /Refresh/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Record update/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Access Restricted/i)).toBeInTheDocument();
  });

  it("hides controls while access is still loading — fails closed", () => {
    mockState = "loading";
    renderWithProviders(
      <ShipmentTrackingTimeline shipmentId={11} trackingNumber={TRACKING_NUMBER} />,
    );
    expect(screen.queryByRole("button", { name: /Refresh/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Record update/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Access Restricted/i)).not.toBeInTheDocument();
  });
});
