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
  message: string | null;
}

const GUIDANCE: Record<EmployeeAdmissionStatus, EmployeeAdmissionGuidance> = {
  available: { blocking: false, attachToExistingMember: false, message: null },
  "member-without-employment": {
    blocking: false,
    attachToExistingMember: true,
    message:
      "This person is already a member of this organization. Continuing attaches an employment record to their existing account — it does not create a second login or use another seat.",
  },
  employee: {
    blocking: true,
    attachToExistingMember: false,
    message: "This email already belongs to an employee in your organization.",
  },
  "archived-member": {
    blocking: true,
    attachToExistingMember: false,
    message:
      "This person was archived or suspended in this organization. Restore them from Users instead of onboarding them again.",
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
