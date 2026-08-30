import { queryKeyBase as base, trimKey as k } from "./base";

/**
 * R2 — a key never ends in `undefined`.
 *
 * A4 found the shape of the bug on `products()`: an optional trailing argument
 * that is not supplied still occupies a slot, so `products()` yielded
 * `[..., "products", undefined]`. TanStack's partial match walks the *filter*
 * key's own indexes, so index 3 compared `undefined` against a stored params
 * object and never matched — every no-argument
 * `invalidateQueries({ queryKey: products() })` was a silent no-op, and there
 * were roughly 110 of them across the inventory hooks. Two families got a
 * hand-written `*List` sibling; the other forty did not.
 *
 * Trimming the trailing gap here fixes all of them at once and makes the fix
 * structural rather than a convention to remember: a params-less call *is* the
 * prefix, so it partial-matches every filtered variant of the same list. The
 * `*List` constants below are that same array under a name, kept because the
 * hooks already read them and because naming the prefix says out loud that
 * invalidation is what it is for.
 */
const list = (segment: string) => [...base, "inventory", segment] as const;

export const inventoryQueryKeys = {
  inventory: {
    all: [...base, "inventory"] as const,

    /**
     * Params-less prefixes, for invalidation. Each is exactly what the matching
     * factory returns when called with no argument; read with `products(params)`,
     * invalidate with either.
     */
    productsList: list("products"),
    productVariantsList: list("productVariants"),
    reservationsList: list("reservations"),
    stockLevelsList: list("stockLevels"),
    stockTransactionsList: list("stockTransactions"),
    adjustmentsList: list("adjustments"),
    transfersList: list("transfers"),
    vendorsList: list("vendors"),
    purchaseOrdersList: list("purchaseOrders"),
    salesOrdersList: list("salesOrders"),
    lotsList: list("lots"),
    serialsList: list("serials"),
    expiryList: list("expiry"),
    reconciliationList: list("reconciliation"),
    traceabilityList: list("traceability"),
    vendorReturnsList: list("vendorReturns"),
    customerReturnsList: list("customerReturns"),
    cycleCountsList: list("cycleCounts"),
    physicalAuditsList: list("physicalAudits"),
    goodsReceiptsList: list("goodsReceipts"),
    replenishmentRulesList: list("replenishmentRules"),
    replenishmentSuggestionsList: list("replenishmentSuggestions"),
    forecastingList: list("forecasting"),
    valuationReportList: list("valuationReport"),
    valuationLayersList: list("valuationLayers"),
    costingProductsList: list("costingProducts"),
    qualityInspectionsList: list("qualityInspections"),
    qualityHoldsList: list("qualityHolds"),
    recallsList: list("recalls"),
    packagesList: list("packages"),
    shipmentsList: list("shipments"),
    loadsList: list("loads"),
    importJobsList: list("importJobs"),
    exportJobsList: list("exportJobs"),
    stockSummaryList: list("stockSummary"),
    reorderReportList: list("reorderReport"),
    movementsReportList: list("movementsReport"),
    slowMovingReportList: list("slowMovingReport"),
    expiryReportList: list("expiryReport"),
    aiInsightsList: list("aiInsights"),
    webhookEventsList: list("webhookEvents"),
    auditEventsList: list("auditEvents"),

    products: (params?: Record<string, unknown>) => k(...base, "inventory", "products", params),
    product: (productId: number) => k(...base, "inventory", "product", productId),
    productVariants: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "productVariants", params),
    categories: () => k(...base, "inventory", "categories"),
    uom: () => k(...base, "inventory", "uom"),
    warehouses: () => k(...base, "inventory", "warehouses"),
    warehouse: (warehouseId: number) => k(...base, "inventory", "warehouse", warehouseId),
    locations: (warehouseId: number) => k(...base, "inventory", "locations", warehouseId),
    availability: (variantId: number, warehouseId?: number) =>
      k(...base, "inventory", "availability", variantId, warehouseId),
    reservations: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "reservations", params),
    stockLevels: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "stockLevels", params),
    stockTransactions: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "stockTransactions", params),
    adjustments: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "adjustments", params),
    transfers: (params?: Record<string, unknown>) => k(...base, "inventory", "transfers", params),
    transfer: (transferId: number) => k(...base, "inventory", "transfer", transferId),
    vendors: (params?: Record<string, unknown>) => k(...base, "inventory", "vendors", params),
    vendor: (vendorId: number) => k(...base, "inventory", "vendor", vendorId),
    purchaseOrders: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "purchaseOrders", params),
    purchaseOrder: (purchaseOrderId: number) =>
      k(...base, "inventory", "purchaseOrder", purchaseOrderId),
    salesOrders: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "salesOrders", params),
    salesOrder: (salesOrderId: number) => k(...base, "inventory", "salesOrder", salesOrderId),
    dashboard: () => k(...base, "inventory", "dashboard"),
    stockSummary: (params?: object) => k(...base, "inventory", "stockSummary", params),
    reorderReport: (params?: object) => k(...base, "inventory", "reorderReport", params),
    movementsReport: (params?: object) => k(...base, "inventory", "movementsReport", params),
    auditEvents: (params?: object) => k(...base, "inventory", "auditEvents", params),
    lots: (params?: Record<string, unknown>) => k(...base, "inventory", "lots", params),
    lot: (lotId: number) => k(...base, "inventory", "lot", lotId),
    serials: (params?: Record<string, unknown>) => k(...base, "inventory", "serials", params),
    serial: (serialId: number) => k(...base, "inventory", "serial", serialId),
    expiry: (params?: Record<string, unknown>) => k(...base, "inventory", "expiry", params),
    reconciliation: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "reconciliation", params),
    traceability: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "traceability", params),
    vendorReturns: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "vendorReturns", params),
    vendorReturn: (vendorReturnId: number) =>
      k(...base, "inventory", "vendorReturn", vendorReturnId),
    customerReturns: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "customerReturns", params),
    customerReturn: (customerReturnId: number) =>
      k(...base, "inventory", "customerReturn", customerReturnId),
    cycleCounts: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "cycleCounts", params),
    cycleCount: (cycleCountId: number) => k(...base, "inventory", "cycleCount", cycleCountId),
    physicalAudits: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "physicalAudits", params),
    physicalAudit: (physicalAuditId: number) =>
      k(...base, "inventory", "physicalAudit", physicalAuditId),
    goodsReceipts: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "goodsReceipts", params),
    goodsReceipt: (goodsReceiptId: number) =>
      k(...base, "inventory", "goodsReceipt", goodsReceiptId),
    replenishmentRules: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "replenishmentRules", params),
    replenishmentSuggestions: (params?: object) =>
      k(...base, "inventory", "replenishmentSuggestions", params),
    forecasting: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "forecasting", params),
    valuationReport: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "valuationReport", params),
    valuationLayers: (variantId: number, page?: number) =>
      k(...base, "inventory", "valuationLayers", variantId, page),
    costingProducts: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "costingProducts", params),
    slowMovingReport: (params?: object) => k(...base, "inventory", "slowMovingReport", params),
    expiryReport: (params?: object) => k(...base, "inventory", "expiryReport", params),
    qualityInspections: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "qualityInspections", params),
    qualityInspection: (qualityInspectionId: number) =>
      k(...base, "inventory", "qualityInspection", qualityInspectionId),
    qualityHolds: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "qualityHolds", params),
    recalls: (params?: Record<string, unknown>) => k(...base, "inventory", "recalls", params),
    recall: (recallId: number) => k(...base, "inventory", "recall", recallId),
    packages: (params?: Record<string, unknown>) => k(...base, "inventory", "packages", params),
    packageDetail: (packageId: number) => k(...base, "inventory", "packageDetail", packageId),
    shipments: (params?: Record<string, unknown>) => k(...base, "inventory", "shipments", params),
    shipment: (shipmentId: number) => k(...base, "inventory", "shipment", shipmentId),
    shipmentTimeline: (shipmentId: number) =>
      k(...base, "inventory", "shipmentTimeline", shipmentId),
    loads: (params?: Record<string, unknown>) => k(...base, "inventory", "loads", params),
    load: (loadId: number) => k(...base, "inventory", "load", loadId),
    carriers: () => k(...base, "inventory", "carriers"),
    channels: () => k(...base, "inventory", "channels"),

    /**
     * NEO-1. `channelPoolsAll` is the params-less prefix every pool key hangs
     * off, so one invalidation after an allocation reaches the channel list, the
     * per-variant popover and the availability probe together — the R2 rule at
     * the top of this file, applied to a family added after it was written.
     */
    channelPoolsAll: [...base, "inventory", "channelPools"] as const,
    channelPools: (channelId: number) => k(...base, "inventory", "channelPools", channelId),
    channelPoolsByVariant: (productVariantId: number, warehouseId: number | null) =>
      k(...base, "inventory", "channelPools", "variant", productVariantId, warehouseId ?? "all"),
    channelPoolAvailability: (
      productVariantId: number,
      warehouseId: number | null,
      forChannelId: number | null,
    ) =>
      k(
        ...base,
        "inventory",
        "channelPools",
        "availability",
        productVariantId,
        warehouseId ?? "all",
        forChannelId ?? "direct",
      ),
    channel: (channelId: number) => k(...base, "inventory", "channel", channelId),
    channelPublications: (channelId: number) =>
      k(...base, "inventory", "channelPublications", channelId),
    threePlConnections: () => k(...base, "inventory", "threePlConnections"),
    importJobs: (params?: Record<string, unknown>) => k(...base, "inventory", "importJobs", params),
    importJob: (importJobId: number) => k(...base, "inventory", "importJob", importJobId),
    exportJobs: (params?: Record<string, unknown>) => k(...base, "inventory", "exportJobs", params),
    exportJob: (exportJobId: number) => k(...base, "inventory", "exportJob", exportJobId),
    settings: () => k(...base, "inventory", "settings"),
    packs: () => k(...base, "inventory", "packs"),
    numberSequences: () => k(...base, "inventory", "numberSequences"),
    aiInsights: (params?: object) => k(...base, "inventory", "aiInsights", params),
    aiDigest: (narrate?: boolean) => k(...base, "inventory", "aiDigest", narrate),
    opsBrief: () => k(...base, "inventory", "opsBrief"),
    reorderProposal: (productVariantId: number) =>
      k(...base, "inventory", "reorderProposal", productVariantId),
    demandBaseline: (productVariantId: number) =>
      k(...base, "inventory", "demandBaseline", productVariantId),
    supplierDelayBriefing: (vendorId?: string) =>
      k(...base, "inventory", "supplierDelayBriefing", vendorId),
    barcodeLookup: (code: string) => k(...base, "inventory", "barcodeLookup", code),
    variantLabel: (productVariantId: number, lotId?: number) =>
      k(...base, "inventory", "variantLabel", productVariantId, lotId),
    landedCostVouchers: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "landedCostVouchers", params),
    landedCostVoucher: (voucherId: number) =>
      k(...base, "inventory", "landedCostVoucher", voucherId),
    qualityHold: (qualityHoldId: number) => k(...base, "inventory", "qualityHold", qualityHoldId),
    webhooks: () => k(...base, "inventory", "webhooks"),
    webhookEvents: (webhookId: number, params?: Record<string, unknown>) =>
      k(...base, "inventory", "webhookEvents", webhookId, params),
  },
} as const;
