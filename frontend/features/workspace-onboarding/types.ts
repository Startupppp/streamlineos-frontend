export interface SetupSummary {
  industry: string;
  modulesInstalled: string[];
  teamMembersInvited: number;
  workspaceCreated: boolean;
}

export interface CompanyProfileData {
  name: string;
  teamSize: string;
  country: string;
  timezone: string;
  currency: string;
}
