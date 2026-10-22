import { queryKeyBase as base } from "./base";

export const inventoryCopilotQueryKeys = {
  inventoryCopilot: {
    all: [...base, "inventory", "copilot"] as const,
    ask: [...base, "inventory", "copilot", "ask"] as const,
  },
} as const;
