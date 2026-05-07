/**
 * Merge keys populated automatically by POST /api/hr/integrations/send-email
 * when `employeeUserId` or `mergeDataFromUserId` is set (see buildEmployeeAutoVars).
 * UI uses this set to decide which {{placeholders}} still need manual input.
 */
export const HR_EMAIL_EMPLOYEE_AUTO_MERGE_KEYS = [
  "name",
  "firstName",
  "lastName",
  "email",
  "employeeCode",
  "designation",
  "department",
  "joiningDate",
  "phone",
  "date",
  "today",
  "employee_name",
  "employeeName",
  "full_name",
  "fullName",
] as const;

/** When sending with candidateId */
export const HR_EMAIL_CANDIDATE_AUTO_MERGE_KEYS = [
  "candidateName",
  "candidate_name",
  "candidateEmail",
  "candidateFirstName",
  "candidateLastName",
] as const;

export const HR_EMAIL_EMPLOYEE_AUTO_MERGE_KEY_SET = new Set<string>(
  HR_EMAIL_EMPLOYEE_AUTO_MERGE_KEYS as unknown as string[]
);

export const HR_EMAIL_CANDIDATE_AUTO_MERGE_KEY_SET = new Set<string>(
  HR_EMAIL_CANDIDATE_AUTO_MERGE_KEYS as unknown as string[]
);
