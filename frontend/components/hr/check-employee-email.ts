import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import type {
  EmployeeAdmissionCheck,
  EmployeeAdmissionStatus,
} from "@/components/hr/check-email-schema";

const checkEmailContract = lazyContract(() =>
  import("@/components/hr/check-email-schema").then((m) => m.checkEmailContract),
);

export interface EmployeeAdmissionGuidance {
  blocking: boolean;
  attachToExistingMember: boolean;
  canAttach: boolean;
  message: string | null;
}

export const ATTACH_EXISTING_MEMBER_LABEL = "Add an employee record to this member";

export const ATTACHED_EXISTING_MEMBER_NOTICE =
  "Continuing attaches an employment record to their existing account. It does not create a second login or use another seat.";

const GUIDANCE: Record<EmployeeAdmissionStatus, EmployeeAdmissionGuidance> = {
  available: { blocking: false, attachToExistingMember: false, canAttach: false, message: null },
  "member-without-employment": {
    blocking: true,
    attachToExistingMember: false,
    canAttach: true,
    message: `This email belongs to a member of your organization who has no employee record yet. To link them, choose "${ATTACH_EXISTING_MEMBER_LABEL}" below instead of creating a new person.`,
  },
  employee: {
    blocking: true,
    attachToExistingMember: false,
    canAttach: false,
    message: "This email already belongs to an employee in your organization.",
  },
  "archived-member": {
    blocking: true,
    attachToExistingMember: false,
    canAttach: false,
    message:
      "This person was archived or suspended in this organization. Restore them from Users instead of onboarding them again.",
  },
  invite: {
    blocking: true,
    attachToExistingMember: false,
    canAttach: false,
    message:
      "This email already has a pending invitation. Resend or cancel it from People → Invitations instead of onboarding again.",
  },
};

export function employeeAdmissionGuidance(
  status: EmployeeAdmissionStatus,
): EmployeeAdmissionGuidance {
  return GUIDANCE[status];
}

export function fetchEmployeeAdmissionCheck(
  email: string,
): Promise<EmployeeAdmissionCheck> {
  return apiClient.get(
    `/hr/employees/check-email?email=${encodeURIComponent(email)}`,
    undefined,
    undefined,
    checkEmailContract,
  );
}
