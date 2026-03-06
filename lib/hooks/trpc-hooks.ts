// Barrel re-export — all domain hook files
// Existing imports from "@/lib/hooks/trpc-hooks" continue to work.

export { vaivammKeys } from "./trpc-keys";
export type { MutationOnSuccess } from "./trpc-keys";
export * from "./hr-hooks";
export * from "./project-hooks";
export * from "./dashboard-hooks";
export * from "./rbac-hooks";
export * from "./reports-hooks";
export * from "./crm-hooks";
