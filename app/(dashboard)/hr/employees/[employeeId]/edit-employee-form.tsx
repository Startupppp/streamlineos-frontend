"use client";

import { useCallback, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useUpdateProfile } from "@/lib/api/hooks/hr";
import { Loader2 } from "lucide-react";
import { useRolesList } from "@/lib/api/hooks/roles";
import { PersonalInfoSection } from "@/features/hr/employees/detail/personal-info-section";
import { ProfessionalInfoSection } from "@/features/hr/employees/detail/professional-info-section";
import { BankDetailsSection } from "@/features/hr/employees/detail/bank-details-section";

const formSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  role: z.string(),
  designation: z
    .string()
    .min(2, "Designation must be at least 2 characters")
    .max(100, "Designation must be at most 100 characters")
    .refine((v) => /[a-zA-Z]/.test(v), "Designation must contain at least one letter")
    .refine((v) => !/\s{2,}/.test(v), "Designation cannot have consecutive spaces")
    .optional()
    .or(z.literal("")),
  departmentId: z.number().optional(),
  phone: z
    .string()
    .refine((val) => {
      if (!val) return true;
      return !/[a-zA-Z]/.test(val);
    }, "Phone number must not contain letters")
    .refine((val) => {
      if (!val) return true;
      const digits = val.replace(/[\s+\-()]/g, "");
      return digits.length >= 7 && digits.length <= 15;
    }, "Phone number must be 7–15 digits")
    .optional()
    .or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  joiningDate: z.date().optional(),
  experienceYears: z.number().min(0, "Experience cannot be negative").max(60, "Experience cannot exceed 60 years").optional(),
  skills: z
    .string()
    .max(500, "Skills must be at most 500 characters")
    .refine((v) => {
      if (!v?.trim()) return true;
      return v.split(",").every((s) => !s.trim() || /[a-zA-Z]/.test(s.trim()));
    }, "Each skill must contain at least one letter")
    .optional(),
  taxId: z.string().optional(),
  monthlySalary: z.number().min(0, "Salary cannot be negative").optional(),
  bankAccount: z.string().optional(),
  bankName: z.string().optional(),
  branch: z.string().optional(),
  ifsc: z.string().optional(),
  accountHolder: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.skills?.trim()) {
    const parts = data.skills.split(",").map((s) => s.trim()).filter(Boolean);
    const seen = new Set<string>();
    for (const part of parts) {
      const key = part.toLowerCase();
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate skill: "${part}" already exists`,
          path: ["skills"],
        });
        break;
      }
      seen.add(key);
    }
  }
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
  isActive: boolean | null;
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
  const updateProfileMutation = useUpdateProfile();
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
    const seenSkills = new Set<string>();
    const skillsArray = values.skills
      ? values.skills
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s && /[a-zA-Z0-9]/.test(s))
          .reduce<string[]>((acc, s) => {
            const key = s.toLowerCase();
            if (seenSkills.has(key)) return acc;
            seenSkills.add(key);
            acc.push(s.charAt(0).toUpperCase() + s.slice(1));
            return acc;
          }, [])
      : [];

    toast.promise(
      updateProfileMutation.mutateAsync({
        userId: employee.id,
        firstName: values.firstName,
        lastName: values.lastName,
        role: values.role as string,
        designation: values.designation,
        departmentId: values.departmentId,
        phone: values.phone,
        gender: values.gender,
        joiningDate: values.joiningDate?.toISOString().slice(0, 10),
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
      }),
      {
        loading: "Updating employee...",
        success: () => {
          router.push("/hr/employees");
          router.refresh();
          return "Employee updated successfully!";
        },
        error: "Failed to update employee",
      }
    );
  }, [employee.id, router, updateProfileMutation]);

  const handleCancel = useCallback(() => router.back(), [router]);

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
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
            <Button variant="outline" size="sm" type="button" onClick={handleCancel} disabled={updateProfileMutation.isPending}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
