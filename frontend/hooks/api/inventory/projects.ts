"use client";

/**
 * B1 — construction projects, as one import for callers.
 *
 * Split three ways because the frontend holds a 300-line ratchet per file and
 * this had grown past it: the shapes and the decimal seam in `projects-types`,
 * the reads in `projects-queries`, the writes in `projects-mutations`. The
 * barrel keeps every existing `@/hooks/api/inventory/projects` import working.
 */
export * from "./projects-types";
export * from "./projects-queries";
export * from "./projects-mutations";
