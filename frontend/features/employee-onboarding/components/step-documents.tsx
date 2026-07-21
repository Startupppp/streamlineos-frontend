"use client";

import { useCallback, useState } from "react";
import { EmployeeDocumentsTab } from "@/features/hr/onboarding/onboarding-detail-sheet";
import { NavButtons } from "./nav-buttons";
import { StepBody } from "./step-body";

type StepDocumentsProps = {
  countryCode: string;
  onComplete: () => void;
  onBack: () => void;
};

export function StepDocuments({ countryCode, onComplete, onBack }: StepDocumentsProps) {
  const [canContinue, setCanContinue] = useState(true);

  const handleCanContinueChange = useCallback((next: boolean) => {
    setCanContinue(next);
  }, []);

  return (
    <StepBody
      footer={
        <NavButtons
          onBack={onBack}
          onNext={onComplete}
          nextLabel="Continue"
          nextDisabled={!canContinue}
        />
      }
    >
      <EmployeeDocumentsTab
        variant="wizard"
        hideNav
        countryCode={countryCode}
        onCanContinueChange={handleCanContinueChange}
      />
    </StepBody>
  );
}
