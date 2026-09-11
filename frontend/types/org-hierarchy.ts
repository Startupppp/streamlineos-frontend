export type NodeStatus = "ACTIVE" | "DISABLED" | "ARCHIVED";
export type LocationType = "OFFICE" | "WAREHOUSE" | "STORE" | "FACTORY" | "REMOTE";
export type OrgUnitKind =
  | "BUSINESS_UNIT"
  | "BRANCH"
  | "DEPARTMENT"
  | "TEAM"
  | "LOCATION"
  | "COST_CENTER";

export interface OrgUnitDependency {
  key: string;
  label: string;
  count: number;
}

export interface OrgUnitDependencyPreview {
  unitId: string;
  unitKind: OrgUnitKind;
  mode: "archive" | "retire";
  dependencies: OrgUnitDependency[];
  totalDependencies: number;
}

export interface OrgBusinessUnit {
  id: string;
  orgId: string;
  parentId: string | null;
  name: string;
  code: string | null;
  description: string | null;
  status: NodeStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface OrgBranch {
  id: string;
  orgId: string;
  businessUnitId: string | null;
  businessUnitName?: string | null;
  managerUserId: string | null;
  name: string;
  code: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  status: NodeStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface OrgDepartment {
  id: string;
  orgId: string;
  branchId: string | null;
  branchName?: string | null;
  headUserId: string | null;
  name: string;
  code: string | null;
  description: string | null;
  status: NodeStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface OrgTeam {
  id: string;
  orgId: string;
  departmentId: string | null;
  departmentName?: string | null;
  leadUserId: string | null;
  name: string;
  code: string | null;
  description: string | null;
  capacity: number | null;
  status: NodeStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface OrgLocation {
  id: string;
  orgId: string;
  name: string;
  type: LocationType;
  address: string | null;
  latitude: string | null;
  longitude: string | null;
  status: NodeStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface OrgCostCenter {
  id: string;
  orgId: string;
  code: string;
  name: string;
  description: string | null;
  status: NodeStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface OrgTreeTeam extends OrgTeam {
  type: "team";
  children: never[];
}

export interface OrgTreeDepartment extends OrgDepartment {
  type: "department";
  children: OrgTreeTeam[];
}

export interface OrgTreeBranch extends OrgBranch {
  type: "branch";
  children: OrgTreeDepartment[];
}

/**
 * A business unit is the tree's root level, and `buildTree` destructures
 * `parentId` away when it builds the node — so the tree's business unit is
 * `OrgBusinessUnit` MINUS that column, not a superset of it. Declaring a field
 * the read does not return is how one becomes silently `undefined` at runtime.
 */
export interface OrgTreeBusinessUnit extends Omit<OrgBusinessUnit, "parentId"> {
  type: "business_unit";
  children: OrgTreeBranch[];
}

export type OrgTreeRoot =
  | OrgTreeBusinessUnit
  | OrgTreeBranch
  | OrgTreeDepartment
  | OrgTreeTeam;

export type OrgTreeNode = OrgTreeRoot;

export interface OrgHierarchyOverview {
  businessUnits: number;
  branches: number;
  departments: number;
  teams: number;
  locations: number;
  costCenters: number;
}
