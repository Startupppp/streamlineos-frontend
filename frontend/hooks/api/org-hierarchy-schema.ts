import { z } from "zod";
import { cursorPageInfoContract } from "@/hooks/api/cursor-page-schema";

/**
 * Contracts for `OrgHierarchyController` handlers.
 *
 * List endpoints use `toOrgUnitCursorPage`, which wraps in
 * `{ data, pageInfo: { limit, hasMore, nextCursor } }` — the `pageInfo` key,
 * not the global `pagination` key used by `buildCursorPage`. The two helpers
 * are NOT interchangeable; a contract that used `pagination` would silently
 * accept the real response and then derive undefined cursors from it.
 *
 * `wireDate()` serialises to ISO strings over JSON, so every timestamp column
 * is `z.string()` here (not `z.date()`).
 *
 * NOT `.strict()`: extra response fields are backward-compatible.
 */

const nodeStatusEnum = z.enum(["ACTIVE", "DISABLED", "ARCHIVED"]);

const orgUnitTimestamps = {
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
};

const businessUnitItemContract = z.object({
  id: z.string(),
  orgId: z.string(),
  parentId: z.string().nullable(),
  name: z.string(),
  code: z.string().nullable(),
  description: z.string().nullable(),
  status: nodeStatusEnum,
  ...orgUnitTimestamps,
});

export const businessUnitListContract = cursorPageInfoContract(businessUnitItemContract);
export const businessUnitContract = businessUnitItemContract;

const branchItemContract = z.object({
  id: z.string(),
  orgId: z.string(),
  businessUnitId: z.string().nullable(),
  managerUserId: z.string().nullable(),
  name: z.string(),
  code: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  postalCode: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  status: nodeStatusEnum,
  businessUnitName: z.string().nullable().optional(),
  ...orgUnitTimestamps,
});

export const orgBranchListContract = cursorPageInfoContract(branchItemContract);
export const orgBranchContract = branchItemContract;

const departmentItemContract = z.object({
  id: z.string(),
  orgId: z.string(),
  branchId: z.string().nullable(),
  headUserId: z.string().nullable(),
  name: z.string(),
  code: z.string().nullable(),
  description: z.string().nullable(),
  status: nodeStatusEnum,
  branchName: z.string().nullable().optional(),
  ...orgUnitTimestamps,
});

export const departmentListContract = cursorPageInfoContract(departmentItemContract);
export const departmentContract = departmentItemContract;

const teamItemContract = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  code: z.string().nullable(),
  description: z.string().nullable(),
  status: nodeStatusEnum,
  departmentId: z.string().nullable(),
  leadUserId: z.string().nullable(),
  capacity: z.number().nullable(),
  departmentName: z.string().nullable().optional(),
  ...orgUnitTimestamps,
});

export const teamListContract = cursorPageInfoContract(teamItemContract);
export const teamContract = teamItemContract;

const locationItemContract = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  type: z.enum(["OFFICE", "WAREHOUSE", "STORE", "FACTORY", "REMOTE"]),
  address: z.string().nullable(),
  latitude: z.string().nullable(),
  longitude: z.string().nullable(),
  status: nodeStatusEnum,
  ...orgUnitTimestamps,
});

export const locationListContract = cursorPageInfoContract(locationItemContract);
export const locationContract = locationItemContract;

const costCenterItemContract = z.object({
  id: z.string(),
  orgId: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: nodeStatusEnum,
  ...orgUnitTimestamps,
});

export const costCenterListContract = cursorPageInfoContract(costCenterItemContract);
export const costCenterContract = costCenterItemContract;

export const hierarchyOverviewContract = z.object({
  businessUnits: z.number(),
  branches: z.number(),
  departments: z.number(),
  teams: z.number(),
  locations: z.number(),
  costCenters: z.number(),
});

/**
 * `OrgHierarchyReadService.buildTree` — business_unit > branch > department >
 * team, with any node orphaned from its parent returned at the root, so all
 * four kinds are root candidates.
 *
 * The nodes are NOT the list rows. `buildTree` destructures the raw org-unit row
 * rather than calling the `toOrg*` mappers, so: a business unit DROPS `parentId`
 * (it is the root level), a branch ADDS `description` (which the branch list
 * projection does not carry) and lifts its address block out of `metadata`, and
 * a team is the only kind whose node comes from a mapper. Written from the
 * service, not from the list contracts above.
 */
const teamNodeContract = teamItemContract.extend({
  type: z.literal("team"),
  children: z.array(z.never()),
});

const departmentNodeContract = departmentItemContract.extend({
  type: z.literal("department"),
  children: z.array(teamNodeContract),
});

const branchNodeContract = branchItemContract.extend({
  description: z.string().nullable(),
  type: z.literal("branch"),
  children: z.array(departmentNodeContract),
});

const businessUnitNodeContract = businessUnitItemContract
  .omit({ parentId: true })
  .extend({
    type: z.literal("business_unit"),
    children: z.array(branchNodeContract),
  });

export const hierarchyTreeContract = z.array(
  z.discriminatedUnion("type", [
    businessUnitNodeContract,
    branchNodeContract,
    departmentNodeContract,
    teamNodeContract,
  ]),
);

export const dependencyPreviewContract = z.object({
  unitId: z.string(),
  unitKind: z.enum(["BUSINESS_UNIT", "BRANCH", "DEPARTMENT", "TEAM", "LOCATION", "COST_CENTER"]),
  mode: z.enum(["archive", "retire"]),
  dependencies: z.array(z.object({
    key: z.string(),
    label: z.string(),
    count: z.number(),
  })),
  totalDependencies: z.number(),
});

export const hierarchyParentListContract = cursorPageInfoContract(
  z.object({
    id: z.string(),
    orgId: z.string(),
    name: z.string(),
    status: nodeStatusEnum,
    deletedAt: z.string().nullable(),
  }),
);

export const hierarchyMutationContract = z.object({ success: z.literal(true) });
export const hierarchyDeleteContract = z.object({ message: z.string() });

const holidayItemContract = z.object({
  id: z.string(),
  orgId: z.string(),
  name: z.string(),
  date: z.string(),
  recurring: z.boolean(),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
});

export const holidayListContract = z.array(holidayItemContract);
export const createHolidayContract = holidayItemContract;
