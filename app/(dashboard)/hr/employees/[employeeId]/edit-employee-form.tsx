"use client";

import { useCallback, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { updateEmployee } from "@/server/actions/hr-actions";
import { Loader2 } from "lucide-react";
import { useRolesList } from "@/lib/api/hooks/roles";
import { useState } from "react";
import { PersonalInfoSection } from "@/features/hr/employees/detail/personal-info-section";
import { ProfessionalInfoSection } from "@/features/hr/employees/detail/professional-info-section";
import { BankDetailsSection } from "@/features/hr/employees/detail/bank-details-section";

const formSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  role: z.string(),
  designation: z.string().optional(),
  departmentId: z.number().optional(),
  phone: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  joiningDate: z.date().optional(),
  experienceYears: z.number().optional(),
  skills: z.string().optional(),
  taxId: z.string().optional(),
  monthlySalary: z.number().min(0, "Salary cannot be negative").optional(),
  bankAccount: z.string().optional(),
  bankName: z.string().optional(),
  branch: z.string().optional(),
  ifsc: z.string().optional(),
  accountHolder: z.string().optional(),
});

export type EmployeeFormValues = z.infer<typeof formSchema>;

export interface EmployeeData {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string | null;
  designation: string | null;
  departmentId: number | null;
  phone: string | null;
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  joiningDate: string | Date | null;
  experienceYears: string | number | null;
  skills: string[] | string | null;
  taxId: string | null;
  monthlySalary: string | number | null;
  bankDetails: {
    accountNumber?: string;
    bankName?: string;
    branch?: string;
    ifsc?: string;
    accountHolder?: string;
  } | null;
  [key: string]: unknown;
}

interface EditEmployeeFormProps {
  employee: EmployeeData;
}

export function EditEmployeeForm({ employee }: EditEmployeeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { data: orgRoles } = useRolesList();
  const assignableRoles = useMemo(
    () => (orgRoles || []).filter((r) => r.slug !== "CEO"),
    [orgRoles]
  );

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: employee.firstName || "",
      lastName: employee.lastName || "",
      role: employee.role || "ENGINEERING",
      designation: employee.designation || "",
      departmentId: employee.departmentId || undefined,
      phone: employee.phone || "",
      gender: employee.gender || "MALE",
      joiningDate: employee.joiningDate ? new Date(employee.joiningDate) : undefined,
      experienceYears: employee.experienceYears ? Number(employee.experienceYears) : 0,
      skills: Array.isArray(employee.skills) ? employee.skills.join(", ") : (employee.skills || ""),
      taxId: employee.taxId || "",
      monthlySalary: employee.monthlySalary ? Number(employee.monthlySalary) : undefined,
      bankAccount: employee.bankDetails?.accountNumber || "",
      bankName: employee.bankDetails?.bankName || "",
      branch: employee.bankDetails?.branch || "",
      ifsc: employee.bankDetails?.ifsc || "",
      accountHolder: employee.bankDetails?.accountHolder || "",
    },
  });

  const onSubmit = useCallback(async (values: EmployeeFormValues) => {
    setLoading(true);
    const skillsArray = values.skills
      ? values.skills.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const result = await updateEmployee({
      id: employee.id,
      firstName: values.firstName,
      lastName: values.lastName,
      role: values.role as string,
      designation: values.designation,
      departmentId: values.departmentId,
      phone: values.phone,
      gender: values.gender,
      joiningDate: values.joiningDate,
      experienceYears: values.experienceYears,
      skills: skillsArray,
      taxId: values.taxId,
      monthlySalary: values.monthlySalary,
      bankDetails: values.bankAccount
        ? {
            accountNumber: values.bankAccount,
            bankName: values.bankName || "",
            branch: values.branch || "",
            ifsc: values.ifsc || "",
            accountHolder: values.accountHolder || "",
          }
        : undefined,
    });
    setLoading(false);

    if (result.success) {
      toast.success("Employee updated successfully!");
      router.push("/hr/employees");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update employee");
    }
  }, [employee.id, router]);

  const handleCancel = useCallback(() => router.back(), [router]);

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full min-h-0">
        <div className="rounded-lg border bg-card overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-4">
              <PersonalInfoSection />
            </div>
            <Separator />
            <div className="p-4">
              <ProfessionalInfoSection assignableRoles={assignableRoles} />
            </div>
            <Separator />
            <div className="p-4">
              <BankDetailsSection />
            </div>
          </div>
          <div className="shrink-0 flex justify-end gap-2 px-4 py-3 bg-muted/30 border-t">
            <Button variant="outline" size="sm" type="button" onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
