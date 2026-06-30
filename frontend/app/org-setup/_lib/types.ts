export type Invitee = { email: string; role: string };

export type WizardData = {
  goals: string[];
  industry: string;
  companyName: string;
  teamSize: string;
  installedApps: string[];
  invitees: Invitee[];
};
