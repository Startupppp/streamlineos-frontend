/** Session key for cross-tab PIP create prefill (Appraisals → PIP). */
export const PIP_CREATE_PREFILL_STORAGE_KEY = "vaivamm_capital_pip_create_prefill";

export type PipCreatePrefillPayload = {
  userId: string;
  linkedAppraisalId: number;
};
