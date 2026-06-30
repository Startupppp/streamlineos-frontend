export type Invitee = { email: string; role: string };

export type WizardData = {
  goals: string[];
  industry: string;
  companyName: string;
  teamSize: string;
  country?: string;
  timezone?: string;
  currency?: string;
  installedApps: string[];
  invitees: Invitee[];
};
