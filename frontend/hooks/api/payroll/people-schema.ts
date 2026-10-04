import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";

export const payrollPersonPayeeContract = z
  .discriminatedUnion("kind", [
    z.object({ kind: z.literal("user"), userId: z.string() }),
    z.object({ kind: z.literal("worker"), workerId: z.string() }),
  ])
  .nullable();

export const payrollPersonEligibilityContract = z.enum(["eligible", "has-salary", "needs-payee-link", "exited"]);

export const payrollPersonContract = z.object({
  organizationPersonId: z.string().nullable(),
  displayName: z.string(),
  email: z.string().nullable(),
  employeeNumber: z.string().nullable(),
  payee: payrollPersonPayeeContract,
  hasSalaryProfile: z.boolean(),
  eligibility: payrollPersonEligibilityContract,
});

export const payrollPeoplePageContract = cursorPageContract(payrollPersonContract);

export const payrollPeopleReadinessContract = z.object({
  payable: z.number(),
  withSalary: z.number(),
  payableWithoutSalary: z.number(),
  needsPayeeLink: z.number(),
  payableWithoutSalarySample: z.array(
    z.object({
      organizationPersonId: z.string().nullable(),
      displayName: z.string(),
      payee: payrollPersonPayeeContract,
    }),
  ),
});

export type PayrollPerson = z.infer<typeof payrollPersonContract>;
export type PayrollPersonPayee = z.infer<typeof payrollPersonPayeeContract>;
export type PayrollPeopleReadiness = z.infer<typeof payrollPeopleReadinessContract>;
export type PayrollPeoplePage = {
  data: PayrollPerson[];
  pagination: { limit: number; hasMore: boolean; nextCursor: string | null };
};
