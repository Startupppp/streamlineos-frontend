"use client";

/**
 * C5/C6/C7 — the planning surfaces the backend already computed and could not
 * be reached.
 *
 * Its own file rather than more of `planning.ts`, which is at 445 lines and
 * would cross the 500-line review bar with these added.
 *
 * Every quantity, cost and error figure below is an exact `numeric(18,4)`
 * decimal **string**. The API owns the arithmetic; parsing them into floats on
 * the last hop is exactly what the backend spent `exact.ts` avoiding.
 */

export * from "./replenishment-transfer-plan";
export * from "./replenishment-po-batches";
export * from "./replenishment-drift";
