export type NodeStatus = "ACTIVE" | "DISABLED" | "ARCHIVED";
export type LocationType = "OFFICE" | "WAREHOUSE" | "STORE" | "FACTORY" | "REMOTE";

export interface OrgBusinessUnit {
  id: string;
  orgId: string;
  parentId: string | null;
  name: string;
  code: string;
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
  managerUserId: string | null;
  name: string;
  code: string;
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
  headUserId: string | null;
  name: string;
  code: string;
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
  leadUserId: string | null;
  name: string;
  code: string;
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

export interface OrgTreeNode extends OrgBusinessUnit {
  type: "business_unit";
  children: OrgTreeBranch[];
}

export interface OrgHierarchyOverview {
  businessUnits: number;
  branches: number;
  departments: number;
  teams: number;
  locations: number;
  costCenters: number;
}
