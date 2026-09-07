import { z } from "zod";
import { payrollPolicyRowContract } from "@/hooks/api/payroll/policies-schema";

export const updatePolicyResponseContract = payrollPolicyRowContract;

export type UpdatePolicyResponse = z.infer<typeof updatePolicyResponseContract>;
