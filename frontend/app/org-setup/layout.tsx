import type { ReactNode } from "react";
import { FocusedWizardFrame } from "@/components/wizard-shell";

export default function OrgSetupLayout({ children }: { children: ReactNode }) {
  return (
    <FocusedWizardFrame mainLabel="Organization setup">
      {children}
    </FocusedWizardFrame>
  );
}
