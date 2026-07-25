"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  EmployeeDocumentsTab,
  type EmployeeDocumentsTabHandle,
} from "@/features/hr/onboarding/onboarding-detail-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { NavButtons } from "./nav-buttons";
import { StepBody } from "./step-body";

type StepDocumentsProps = {
  countryCode: string;
  onComplete: () => void;
  onBack: () => void;
};

export function StepDocuments({ countryCode, onComplete, onBack }: StepDocumentsProps) {
  const [canContinue, setCanContinue] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const docsRef = useRef<EmployeeDocumentsTabHandle>(null);

  const handleCanContinueChange = useCallback((next: boolean) => {
    setCanContinue(next);
  }, []);

  const handleContinue = useCallback(async () => {
    setIsPending(true);
    try {
      await docsRef.current?.submitPendingUploads();
      onComplete();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsPending(false);
    }
  }, [onComplete]);

  return (
    <StepBody
      footer={
        <NavButtons
          onBack={onBack}
          onNext={handleContinue}
          nextLabel="Continue"
          nextDisabled={!canContinue}
          isPending={isPending}
          loadingText="Uploading..."
        />
      }
    >
      <EmployeeDocumentsTab
        ref={docsRef}
        variant="wizard"
        hideNav
        countryCode={countryCode}
        onCanContinueChange={handleCanContinueChange}
      />
    </StepBody>
  );
}
