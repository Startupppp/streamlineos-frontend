import { queryKeyBase as base } from "./base";

export const inventoryOutboxQueryKeys = {
  inventoryOutbox: {
    all: [...base, "inventoryOutbox"] as const,
    drain: [...base, "inventoryOutbox", "drain"] as const,
    resolve: [...base, "inventoryOutbox", "resolve"] as const,
    clearSynced: [...base, "inventoryOutbox", "clearSynced"] as const,
  },
} as const;
