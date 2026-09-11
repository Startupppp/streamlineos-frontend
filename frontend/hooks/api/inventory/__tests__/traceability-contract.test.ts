import {
  expiryListContract,
  lotDetailContract,
  lotListContract,
  serialDetailContract,
  traceabilityChainContract,
} from "@/hooks/api/inventory/traceability-schema";

/**
 * The payloads below are what `InvTraceabilityService` and
 * `TraceabilityChainService` build — every quantity a `numeric(18,4)` decimal
 * string, every date column a bare `YYYY-MM-DD`, every relation nested exactly
 * as the Drizzle `with:` clause nests it.
 *
 * The screens read these through the contracts, and before this change they
 * read a flat lot with a numeric `currentStock` that the backend has never
 * sent. A flat lot is therefore asserted to be REJECTED: that drift rendered
 * `undefined.toLocaleString()` on the lot page rather than an error state.
 */

const LOT_DETAIL = {
  lot: {
    id: 44,
    orgId: "org_1",
    productVariantId: 7,
    lotNumber: "LOT-44",
    manufactureDate: "2026-01-05",
    expiryDate: "2027-01-31",
    supplierLotNumber: "SUP-9",
    mrpPaise: null,
    status: "ACTIVE",
    qualityStatus: null,
    metadata: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    productVariant: {
      id: 7,
      productId: 3,
      name: "500mg strip",
      sku: "SKU-7",
      costPrice: "12.5000",
      isActive: true,
      product: { id: 3, name: "Paracetamol", sku: "PARA" },
    },
  },
  stockByLocation: [
    {
      locationId: 11,
      locationName: "Pune A1",
      locationCode: "A1",
      warehouseId: 2,
      warehouseName: "Pune",
      onHand: "120.5000",
      committed: "4.0000",
      blockedQty: null,
    },
  ],
  movements: [
    {
      id: 901,
      transactionType: "GRN",
      quantityChange: "120.5000",
      quantityBefore: "0.0000",
      quantityAfter: "120.5000",
      referenceType: "inv_grn",
      referenceId: "55",
      notes: null,
      createdBy: "user_1",
      createdAt: "2026-08-01T09:00:00.000Z",
      location: { id: 11, name: "Pune A1", code: "A1" },
    },
  ],
};

it("accepts the lot detail the backend builds", () => {
  const parsed = lotDetailContract.parse(LOT_DETAIL);

  expect(parsed.lot.productVariant.product.name).toBe("Paracetamol");
  expect(parsed.stockByLocation[0]?.onHand).toBe("120.5000");
  expect(parsed.movements[0]?.location?.name).toBe("Pune A1");
});

it("rejects the flat lot the screen used to expect", () => {
  const flat = {
    id: 44,
    lotNumber: "LOT-44",
    variantId: 7,
    variantSku: "SKU-7",
    productName: "Paracetamol",
    status: "ACTIVE",
    expiryDate: "2027-01-31",
    currentStock: 120,
    stockByLocation: [],
    movements: [],
    createdAt: "2026-08-01T00:00:00.000Z",
  };

  expect(lotDetailContract.safeParse(flat).success).toBe(false);
});

it("accepts the lot list page, whose stock is a decimal string", () => {
  const parsed = lotListContract.parse({
    items: [
      {
        id: 44,
        orgId: "org_1",
        productVariantId: 7,
        lotNumber: "LOT-44",
        manufactureDate: null,
        expiryDate: "2027-01-31",
        supplierLotNumber: null,
        status: "ACTIVE",
        qualityStatus: null,
        createdAt: "2026-08-01T00:00:00.000Z",
        variantSku: "SKU-7",
        variantName: "500mg strip",
        productId: 3,
        productName: "Paracetamol",
        productSku: "PARA",
        totalOnHand: "120.5000",
      },
    ],
    total: 1,
    page: 1,
    totalPages: 1,
  });

  expect(parsed.items[0]?.totalOnHand).toBe("120.5000");
});

it("accepts the serial detail, whose location carries its warehouse", () => {
  const parsed = serialDetailContract.parse({
    serial: {
      id: 5,
      orgId: "org_1",
      productVariantId: 7,
      serialNumber: "SER-5",
      lotId: 44,
      status: "IN_STOCK",
      currentLocationId: 11,
      metadata: null,
      createdAt: "2026-08-02T00:00:00.000Z",
      updatedAt: "2026-08-02T00:00:00.000Z",
      productVariant: {
        id: 7,
        name: "500mg strip",
        sku: "SKU-7",
        product: { id: 3, name: "Paracetamol", sku: "PARA" },
      },
      currentLocation: {
        id: 11,
        name: "Pune A1",
        code: "A1",
        warehouseId: 2,
        warehouse: { id: 2, name: "Pune", code: "PNQ" },
      },
    },
    movements: [],
  });

  expect(parsed.serial.currentLocation?.warehouse.name).toBe("Pune");
});

it("accepts the bare expiry array, whose rows are keyed by lot id", () => {
  const parsed = expiryListContract.parse([
    {
      id: 44,
      lotNumber: "LOT-44",
      expiryDate: "2026-09-20",
      status: "ACTIVE",
      productVariantId: 7,
      variantSku: "SKU-7",
      variantName: "500mg strip",
      productId: 3,
      productName: "Paracetamol",
      totalOnHand: "12.0000",
      daysUntilExpiry: 8,
    },
  ]);

  expect(parsed[0]?.id).toBe(44);
  expect(parsed[0]?.totalOnHand).toBe("12.0000");
});

it("accepts the chain, whose returns arrive as one discriminated list", () => {
  const parsed = traceabilityChainContract.parse({
    origin: {
      id: 44,
      lotNumber: "LOT-44",
      productVariant: {
        id: 7,
        name: "500mg strip",
        sku: "SKU-7",
        product: { id: 3, name: "Paracetamol", sku: "PARA" },
      },
    },
    receipts: [
      {
        grnId: 55,
        grnNumber: "GRN-55",
        receivedDate: "2026-08-01",
        poId: 21,
        poNumber: "PO-21",
        vendorId: 4,
        vendorName: "Acme Pharma",
        vendorCode: "ACME",
        transactionId: 901,
        qtyReceived: "120.5000",
        receivedAt: "2026-08-01T09:00:00.000Z",
        reversed: false,
      },
    ],
    currentStock: [
      {
        locationId: 11,
        locationName: "Pune A1",
        locationCode: "A1",
        warehouseId: 2,
        warehouseName: "Pune",
        onHand: "120.5000",
        committed: "4.0000",
        blockedQty: "0.0000",
      },
    ],
    shipments: [
      {
        shipmentId: 70,
        shipmentNumber: "SHP-70",
        status: "SHIPPED",
        shippedAt: "2026-08-10T05:00:00.000Z",
        soId: 33,
        quantity: "10.0000",
      },
    ],
    returns: [
      {
        returnId: 12,
        returnNumber: "VR-12",
        status: "POSTED",
        type: "DAMAGED",
        quantity: "2.0000",
        returnType: "DAMAGED",
        category: "vendor",
      },
      {
        returnId: 13,
        returnNumber: "CR-13",
        status: "DRAFT",
        quantity: "1.0000",
        disposition: null,
        category: "customer",
      },
    ],
    events: [
      {
        id: 901,
        transactionType: "GRN",
        quantityChange: "120.5000",
        referenceType: "inv_grn",
        referenceId: "55",
        notes: null,
        createdAt: "2026-08-01T09:00:00.000Z",
        location: { id: 11, name: "Pune A1", code: "A1" },
        creator: { id: "user_1", name: "Asha Rao" },
        reversed: false,
      },
    ],
  });

  expect(parsed.returns.map((entry) => entry.category)).toEqual([
    "vendor",
    "customer",
  ]);
  expect(parsed.events[0]?.creator?.name).toBe("Asha Rao");
});
