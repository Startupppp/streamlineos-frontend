/**
 * Repository layer entry. Each module owns the canonical "load X with its
 * relations" query for one resource. Server-only — these helpers must not
 * leak to client bundles.
 *
 * Pattern:
 *   findByX  — single-row lookup, scoped to org
 *   findXByOrg — paginated list, scoped to org
 *
 * Adopt opportunistically: existing server/queries/* keep working. New code
 * should prefer these to avoid the drift that comes from re-deriving the
 * same join shape in 5 places.
 */
export * as clientsRepo from "./clients";
export * as leadsRepo from "./leads";
export * as dealsRepo from "./deals";
export * as employeesRepo from "./employees";
export * as payrollRepo from "./payroll";
export * as attendanceRepo from "./attendance";
