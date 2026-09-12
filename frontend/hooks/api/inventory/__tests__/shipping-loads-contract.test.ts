import {
  loadDetailContract,
  loadListContract,
} from "@/hooks/api/inventory/shipping-loads-schema";
import {
  LOAD_CREATE_DEFAULTS,
  toCreateLoadInput,
} from "@/features/inventory/components/shipping/load-create-schema";

/**
 * `inv_loads` has a required `load_number` and no `name` column, the list
 * answers rows without their lines, and the detail answers the row plus
 * `lines` of `{ shipmentId | transferId }`. The create body is `.strict()`, so
 * a payload carrying the `name` and `members` the form used to send is a 400
 * rather than a load — which is what the New Load button did.
 */

const LOAD_ROW = {
  id: 8,
  orgId: "org_1",
  loadNumber: "LOAD-8",
  sourceWarehouseId: 2,
  destination: "Pune hub",
  carrierId: 4,
  vehicleRef: "MH12 AB 1234",
  status: "DRAFT",
  dispatchDate: null,
  arrivalDate: null,
  createdBy: "user_1",
  createdByMembershipId: null,
  cancelledAt: null,
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:00:00.000Z",
};

it("accepts the load list, which carries no lines", () => {
  const parsed = loadListContract.parse({
    items: [LOAD_ROW],
    total: 1,
    page: 1,
    totalPages: 1,
  });

  expect(parsed.items[0]?.loadNumber).toBe("LOAD-8");
});

it("accepts the load detail, whose lines name a shipment or a transfer", () => {
  const parsed = loadDetailContract.parse({
    ...LOAD_ROW,
    lines: [
      { id: 31, orgId: "org_1", loadId: 8, shipmentId: 70, transferId: null },
      { id: 32, orgId: "org_1", loadId: 8, shipmentId: null, transferId: 12 },
    ],
  });

  expect(parsed.lines.map((line) => line.shipmentId)).toEqual([70, null]);
});

it("rejects a load that reports a name instead of a load number", () => {
  const named = { ...LOAD_ROW, loadNumber: undefined, name: "Morning run" };

  expect(loadDetailContract.safeParse({ ...named, lines: [] }).success).toBe(false);
});

it("sends only the keys the strict create body accepts", () => {
  const payload = toCreateLoadInput({
    ...LOAD_CREATE_DEFAULTS,
    destination: "  Pune hub  ",
    sourceWarehouseId: "2",
    carrierId: "none",
    shipmentIds: [70],
    transferIds: [12],
  });

  expect(payload).toEqual({
    destination: "Pune hub",
    sourceWarehouseId: 2,
    shipmentIds: [70],
    transferIds: [12],
  });
  expect(Object.keys(payload)).not.toContain("name");
  expect(Object.keys(payload)).not.toContain("members");
});
