/**
 * Barrel re-export for the entire database schema.
 * Every consumer should import from `@/lib/db/schema` — this file ensures
 * backward compatibility with the old monolithic `schema.ts`.
 */

// Enums first (no dependencies)
export * from "./enums";

// Auth & organization (core entities)
export * from "./auth";

// Domain schemas
export * from "./projects";
export * from "./hr";
export * from "./crm";
export * from "./chat";
export * from "./shared";
export * from "./marketing";
