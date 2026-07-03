export type Invitee = { email: string; role: string };

export type StartingDataChoice = "clean" | "sample" | "import";

export type PaymentsChoice = "razorpay" | "stripe" | "manual" | "skip";

export type WizardData = {
  goals: string[];
  industry: string;
  companyName: string;
  teamSize: string;
  country?: string;
  timezone?: string;
  installedApps: string[];
  modules: string[];
  startingData: StartingDataChoice;
  paymentsChoice?: PaymentsChoice;
  invitees: Invitee[];
};
