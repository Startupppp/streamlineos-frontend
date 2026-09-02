import { queryKeyBase as base } from "./base";

export const inventoryQueryKeys = {
  inventory: {
    all: [...base, "inventory"] as const,
    products: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "products"] as const)
        : ([...base, "inventory", "products", params] as const),
    product: (productId: number) =>
      [...base, "inventory", "product", productId] as const,
    productVariants: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "productVariants"] as const)
        : ([...base, "inventory", "productVariants", params] as const),
    categories: () => [...base, "inventory", "categories"] as const,
    uom: () => [...base, "inventory", "uom"] as const,
    warehouses: () => [...base, "inventory", "warehouses"] as const,
    warehouse: (warehouseId: number) =>
      [...base, "inventory", "warehouse", warehouseId] as const,
    locations: (warehouseId: number) =>
      [...base, "inventory", "locations", warehouseId] as const,
    availability: (variantId: number, warehouseId?: number) =>
      warehouseId === undefined
        ? ([...base, "inventory", "availability", variantId] as const)
        : ([...base, "inventory", "availability", variantId, warehouseId] as const),
    reservations: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "reservations"] as const)
        : ([...base, "inventory", "reservations", params] as const),
    stockLevels: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "stockLevels"] as const)
        : ([...base, "inventory", "stockLevels", params] as const),
    stockTransactions: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "stockTransactions"] as const)
        : ([...base, "inventory", "stockTransactions", params] as const),
    adjustments: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "adjustments"] as const)
        : ([...base, "inventory", "adjustments", params] as const),
    transfers: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "transfers"] as const)
        : ([...base, "inventory", "transfers", params] as const),
    transfer: (transferId: number) =>
      [...base, "inventory", "transfer", transferId] as const,
    vendors: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "vendors"] as const)
        : ([...base, "inventory", "vendors", params] as const),
    vendor: (vendorId: number) =>
      [...base, "inventory", "vendor", vendorId] as const,
    purchaseOrders: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "purchaseOrders"] as const)
        : ([...base, "inventory", "purchaseOrders", params] as const),
    purchaseOrder: (purchaseOrderId: number) =>
      [...base, "inventory", "purchaseOrder", purchaseOrderId] as const,
    salesOrders: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "salesOrders"] as const)
        : ([...base, "inventory", "salesOrders", params] as const),
    salesOrder: (salesOrderId: number) =>
      [...base, "inventory", "salesOrder", salesOrderId] as const,
    dashboard: () => [...base, "inventory", "dashboard"] as const,
    stockSummary: (params?: object) =>
      params === undefined
        ? ([...base, "inventory", "stockSummary"] as const)
        : ([...base, "inventory", "stockSummary", params] as const),
    reorderReport: (params?: object) =>
      params === undefined
        ? ([...base, "inventory", "reorderReport"] as const)
        : ([...base, "inventory", "reorderReport", params] as const),
    movementsReport: (params?: object) =>
      params === undefined
        ? ([...base, "inventory", "movementsReport"] as const)
        : ([...base, "inventory", "movementsReport", params] as const),
    lots: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "lots"] as const)
        : ([...base, "inventory", "lots", params] as const),
    lot: (lotId: number) => [...base, "inventory", "lot", lotId] as const,
    serials: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "serials"] as const)
        : ([...base, "inventory", "serials", params] as const),
    serial: (serialId: number) =>
      [...base, "inventory", "serial", serialId] as const,
    expiry: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "expiry"] as const)
        : ([...base, "inventory", "expiry", params] as const),
    traceability: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "traceability"] as const)
        : ([...base, "inventory", "traceability", params] as const),
    vendorReturns: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "vendorReturns"] as const)
        : ([...base, "inventory", "vendorReturns", params] as const),
    vendorReturn: (vendorReturnId: number) =>
      [...base, "inventory", "vendorReturn", vendorReturnId] as const,
    customerReturns: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "customerReturns"] as const)
        : ([...base, "inventory", "customerReturns", params] as const),
    customerReturn: (customerReturnId: number) =>
      [...base, "inventory", "customerReturn", customerReturnId] as const,
    cycleCounts: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "cycleCounts"] as const)
        : ([...base, "inventory", "cycleCounts", params] as const),
    cycleCount: (cycleCountId: number) =>
      [...base, "inventory", "cycleCount", cycleCountId] as const,
    physicalAudits: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "physicalAudits"] as const)
        : ([...base, "inventory", "physicalAudits", params] as const),
    physicalAudit: (physicalAuditId: number) =>
      [...base, "inventory", "physicalAudit", physicalAuditId] as const,
    goodsReceipts: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "goodsReceipts"] as const)
        : ([...base, "inventory", "goodsReceipts", params] as const),
    goodsReceipt: (goodsReceiptId: number) =>
      [...base, "inventory", "goodsReceipt", goodsReceiptId] as const,
    replenishmentRules: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "replenishmentRules"] as const)
        : ([...base, "inventory", "replenishmentRules", params] as const),
    replenishmentSuggestions: (params?: object) =>
      params === undefined
        ? ([...base, "inventory", "replenishmentSuggestions"] as const)
        : ([...base, "inventory", "replenishmentSuggestions", params] as const),
    forecasting: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "forecasting"] as const)
        : ([...base, "inventory", "forecasting", params] as const),
    valuationReport: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "valuationReport"] as const)
        : ([...base, "inventory", "valuationReport", params] as const),
    valuationLayers: (variantId: number, page?: number) =>
      page === undefined
        ? ([...base, "inventory", "valuationLayers", variantId] as const)
        : ([...base, "inventory", "valuationLayers", variantId, page] as const),
    costingProducts: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "costingProducts"] as const)
        : ([...base, "inventory", "costingProducts", params] as const),
    slowMovingReport: (params?: object) =>
      params === undefined
        ? ([...base, "inventory", "slowMovingReport"] as const)
        : ([...base, "inventory", "slowMovingReport", params] as const),
    expiryReport: (params?: object) =>
      params === undefined
        ? ([...base, "inventory", "expiryReport"] as const)
        : ([...base, "inventory", "expiryReport", params] as const),
    qualityInspections: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "qualityInspections"] as const)
        : ([...base, "inventory", "qualityInspections", params] as const),
    qualityInspection: (qualityInspectionId: number) =>
      [...base, "inventory", "qualityInspection", qualityInspectionId] as const,
    qualityHolds: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "qualityHolds"] as const)
        : ([...base, "inventory", "qualityHolds", params] as const),
    recalls: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "recalls"] as const)
        : ([...base, "inventory", "recalls", params] as const),
    recall: (recallId: number) =>
      [...base, "inventory", "recall", recallId] as const,
    packages: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "packages"] as const)
        : ([...base, "inventory", "packages", params] as const),
    packageDetail: (packageId: number) =>
      [...base, "inventory", "packageDetail", packageId] as const,
    shipments: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "shipments"] as const)
        : ([...base, "inventory", "shipments", params] as const),
    shipment: (shipmentId: number) =>
      [...base, "inventory", "shipment", shipmentId] as const,
    loads: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "loads"] as const)
        : ([...base, "inventory", "loads", params] as const),
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
      params === undefined
        ? ([...base, "inventory", "importJobs"] as const)
        : ([...base, "inventory", "importJobs", params] as const),
    importJob: (importJobId: number) =>
      [...base, "inventory", "importJob", importJobId] as const,
    exportJobs: (params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "exportJobs"] as const)
        : ([...base, "inventory", "exportJobs", params] as const),
    exportJob: (exportJobId: number) =>
      [...base, "inventory", "exportJob", exportJobId] as const,
    settings: () => [...base, "inventory", "settings"] as const,
    numberSequences: () => [...base, "inventory", "numberSequences"] as const,
    aiInsights: (params?: object) =>
      params === undefined
        ? ([...base, "inventory", "aiInsights"] as const)
        : ([...base, "inventory", "aiInsights", params] as const),
    aiDigest: (narrate?: boolean) =>
      narrate === undefined
        ? ([...base, "inventory", "aiDigest"] as const)
        : ([...base, "inventory", "aiDigest", narrate] as const),
    supplierDelayBriefing: (vendorId?: string) =>
      vendorId === undefined
        ? ([...base, "inventory", "supplierDelayBriefing"] as const)
        : ([...base, "inventory", "supplierDelayBriefing", vendorId] as const),
    barcodeLookup: (code: string) =>
      [...base, "inventory", "barcodeLookup", code] as const,
    qualityHold: (qualityHoldId: number) =>
      [...base, "inventory", "qualityHold", qualityHoldId] as const,
    webhooks: () => [...base, "inventory", "webhooks"] as const,
    webhookEvents: (webhookId: number, params?: Record<string, unknown>) =>
      params === undefined
        ? ([...base, "inventory", "webhookEvents", webhookId] as const)
        : ([...base, "inventory", "webhookEvents", webhookId, params] as const),
  },

} as const;
