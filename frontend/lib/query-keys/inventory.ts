import { queryKeyBase as base } from "./base";

export const inventoryQueryKeys = {
  inventory: {
    all: [...base, "inventory"] as const,
    /**
     * A4. The params-less prefix, for invalidation.
     *
     * `products()` with no argument yields `[..., "products", undefined]`, and
     * TanStack's partial match walks the filter key's own indexes — so index 3
     * compares `undefined` against a stored params object and never matches.
     * Every no-argument `invalidateQueries({ queryKey: products() })` was
     * therefore a silent no-op, which is why archiving or restoring a product
     * left the list showing the old row.
     *
     * Invalidate with `productsList`; read with `products(params)`.
     */
    productsList: [...base, "inventory", "products"] as const,
    products: (params?: Record<string, unknown>) =>
      [...base, "inventory", "products", params] as const,
    product: (productId: number) =>
      [...base, "inventory", "product", productId] as const,
    productVariants: (params?: Record<string, unknown>) =>
      [...base, "inventory", "productVariants", params] as const,
    categories: () => [...base, "inventory", "categories"] as const,
    uom: () => [...base, "inventory", "uom"] as const,
    warehouses: () => [...base, "inventory", "warehouses"] as const,
    warehouse: (warehouseId: number) =>
      [...base, "inventory", "warehouse", warehouseId] as const,
    locations: (warehouseId: number) =>
      [...base, "inventory", "locations", warehouseId] as const,
    availability: (variantId: number, warehouseId?: number) =>
      [...base, "inventory", "availability", variantId, warehouseId] as const,
    reservations: (params?: Record<string, unknown>) =>
      [...base, "inventory", "reservations", params] as const,
    stockLevels: (params?: Record<string, unknown>) =>
      [...base, "inventory", "stockLevels", params] as const,
    stockTransactions: (params?: Record<string, unknown>) =>
      [...base, "inventory", "stockTransactions", params] as const,
    adjustments: (params?: Record<string, unknown>) =>
      [...base, "inventory", "adjustments", params] as const,
    transfers: (params?: Record<string, unknown>) =>
      [...base, "inventory", "transfers", params] as const,
    transfer: (transferId: number) =>
      [...base, "inventory", "transfer", transferId] as const,
    vendors: (params?: Record<string, unknown>) =>
      [...base, "inventory", "vendors", params] as const,
    vendor: (vendorId: number) =>
      [...base, "inventory", "vendor", vendorId] as const,
    purchaseOrders: (params?: Record<string, unknown>) =>
      [...base, "inventory", "purchaseOrders", params] as const,
    purchaseOrder: (purchaseOrderId: number) =>
      [...base, "inventory", "purchaseOrder", purchaseOrderId] as const,
    salesOrders: (params?: Record<string, unknown>) =>
      [...base, "inventory", "salesOrders", params] as const,
    salesOrder: (salesOrderId: number) =>
      [...base, "inventory", "salesOrder", salesOrderId] as const,
    dashboard: () => [...base, "inventory", "dashboard"] as const,
    stockSummary: (params?: object) =>
      [...base, "inventory", "stockSummary", params] as const,
    reorderReport: (params?: object) =>
      [...base, "inventory", "reorderReport", params] as const,
    movementsReport: (params?: object) =>
      [...base, "inventory", "movementsReport", params] as const,
    lots: (params?: Record<string, unknown>) =>
      [...base, "inventory", "lots", params] as const,
    lot: (lotId: number) => [...base, "inventory", "lot", lotId] as const,
    serials: (params?: Record<string, unknown>) =>
      [...base, "inventory", "serials", params] as const,
    serial: (serialId: number) =>
      [...base, "inventory", "serial", serialId] as const,
    expiry: (params?: Record<string, unknown>) =>
      [...base, "inventory", "expiry", params] as const,
    reconciliation: (params?: Record<string, unknown>) =>
      [...base, "inventory", "reconciliation", params] as const,
    traceability: (params?: Record<string, unknown>) =>
      [...base, "inventory", "traceability", params] as const,
    vendorReturns: (params?: Record<string, unknown>) =>
      [...base, "inventory", "vendorReturns", params] as const,
    vendorReturn: (vendorReturnId: number) =>
      [...base, "inventory", "vendorReturn", vendorReturnId] as const,
    customerReturns: (params?: Record<string, unknown>) =>
      [...base, "inventory", "customerReturns", params] as const,
    customerReturn: (customerReturnId: number) =>
      [...base, "inventory", "customerReturn", customerReturnId] as const,
    cycleCounts: (params?: Record<string, unknown>) =>
      [...base, "inventory", "cycleCounts", params] as const,
    cycleCount: (cycleCountId: number) =>
      [...base, "inventory", "cycleCount", cycleCountId] as const,
    physicalAudits: (params?: Record<string, unknown>) =>
      [...base, "inventory", "physicalAudits", params] as const,
    physicalAudit: (physicalAuditId: number) =>
      [...base, "inventory", "physicalAudit", physicalAuditId] as const,
    /** Params-less prefix, for invalidation. See `productsList`. */
    goodsReceiptsList: [...base, "inventory", "goodsReceipts"] as const,
    goodsReceipts: (params?: Record<string, unknown>) =>
      [...base, "inventory", "goodsReceipts", params] as const,
    goodsReceipt: (goodsReceiptId: number) =>
      [...base, "inventory", "goodsReceipt", goodsReceiptId] as const,
    replenishmentRules: (params?: Record<string, unknown>) =>
      [...base, "inventory", "replenishmentRules", params] as const,
    replenishmentSuggestions: (params?: object) =>
      [...base, "inventory", "replenishmentSuggestions", params] as const,
    forecasting: (params?: Record<string, unknown>) =>
      [...base, "inventory", "forecasting", params] as const,
    valuationReport: (params?: Record<string, unknown>) =>
      [...base, "inventory", "valuationReport", params] as const,
    valuationLayers: (variantId: number, page?: number) =>
      [...base, "inventory", "valuationLayers", variantId, page] as const,
    costingProducts: (params?: Record<string, unknown>) =>
      [...base, "inventory", "costingProducts", params] as const,
    slowMovingReport: (params?: object) =>
      [...base, "inventory", "slowMovingReport", params] as const,
    expiryReport: (params?: object) =>
      [...base, "inventory", "expiryReport", params] as const,
    qualityInspections: (params?: Record<string, unknown>) =>
      [...base, "inventory", "qualityInspections", params] as const,
    qualityInspection: (qualityInspectionId: number) =>
      [...base, "inventory", "qualityInspection", qualityInspectionId] as const,
    qualityHolds: (params?: Record<string, unknown>) =>
      [...base, "inventory", "qualityHolds", params] as const,
    recalls: (params?: Record<string, unknown>) =>
      [...base, "inventory", "recalls", params] as const,
    recall: (recallId: number) =>
      [...base, "inventory", "recall", recallId] as const,
    packages: (params?: Record<string, unknown>) =>
      [...base, "inventory", "packages", params] as const,
    packageDetail: (packageId: number) =>
      [...base, "inventory", "packageDetail", packageId] as const,
    shipments: (params?: Record<string, unknown>) =>
      [...base, "inventory", "shipments", params] as const,
    shipment: (shipmentId: number) =>
      [...base, "inventory", "shipment", shipmentId] as const,
    loads: (params?: Record<string, unknown>) =>
      [...base, "inventory", "loads", params] as const,
    load: (loadId: number) => [...base, "inventory", "load", loadId] as const,
    carriers: () => [...base, "inventory", "carriers"] as const,
    channels: () => [...base, "inventory", "channels"] as const,
    channel: (channelId: number) =>
      [...base, "inventory", "channel", channelId] as const,
    channelPublications: (channelId: number) =>
      [...base, "inventory", "channelPublications", channelId] as const,
    threePlConnections: () =>
      [...base, "inventory", "threePlConnections"] as const,
    importJobs: (params?: Record<string, unknown>) =>
      [...base, "inventory", "importJobs", params] as const,
    importJob: (importJobId: number) =>
      [...base, "inventory", "importJob", importJobId] as const,
    exportJobs: (params?: Record<string, unknown>) =>
      [...base, "inventory", "exportJobs", params] as const,
    exportJob: (exportJobId: number) =>
      [...base, "inventory", "exportJob", exportJobId] as const,
    settings: () => [...base, "inventory", "settings"] as const,
    numberSequences: () => [...base, "inventory", "numberSequences"] as const,
    aiInsights: (params?: object) =>
      [...base, "inventory", "aiInsights", params] as const,
    aiDigest: (narrate?: boolean) =>
      [...base, "inventory", "aiDigest", narrate] as const,
    opsBrief: () => [...base, "inventory", "opsBrief"] as const,
    reorderProposal: (productVariantId: number) =>
      [...base, "inventory", "reorderProposal", productVariantId] as const,
    demandBaseline: (productVariantId: number) =>
      [...base, "inventory", "demandBaseline", productVariantId] as const,
    supplierDelayBriefing: (vendorId?: string) =>
      [...base, "inventory", "supplierDelayBriefing", vendorId] as const,
    barcodeLookup: (code: string) =>
      [...base, "inventory", "barcodeLookup", code] as const,
    qualityHold: (qualityHoldId: number) =>
      [...base, "inventory", "qualityHold", qualityHoldId] as const,
    webhooks: () => [...base, "inventory", "webhooks"] as const,
    webhookEvents: (webhookId: number, params?: Record<string, unknown>) =>
      [...base, "inventory", "webhookEvents", webhookId, params] as const,
  },

} as const;
