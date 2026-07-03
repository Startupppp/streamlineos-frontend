export type Invitee = { email: string; role: string; department?: string };

export type StartingDataChoice = "clean" | "sample" | "import";

export type PaymentsChoice = "razorpay" | "stripe" | "manual" | "skip";

export type WizardData = {
  goals: string[];
  industry: string;
  companyName: string;
  teamSize: string;
  country?: string;
  timezone?: string;
  // Captured in the setup draft/session for later use; not yet persisted onto the
  // organization record (backend setupSchema doesn't accept them yet — deliberately
  // out of scope for this visual pass, tracked as a follow-up).
  currency?: string;
  fiscalYearStart?: string;
  businessAddress?: string;
  taxId?: string;
  installedApps: string[];
  modules: string[];
  startingData: StartingDataChoice;
  paymentsChoice?: PaymentsChoice;
  invitees: Invitee[];
};
