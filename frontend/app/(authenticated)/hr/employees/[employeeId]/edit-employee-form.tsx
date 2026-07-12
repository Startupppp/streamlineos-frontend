"use client";

import { useCallback, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useUpdateProfile } from "@/hooks/api/hr";
import { Loader2, Save } from "lucide-react";
import { useRoles } from "@/hooks/api/roles";
import { PersonalInfoSection } from "@/features/hr/employees/detail/personal-info-section";
import { ProfessionalInfoSection } from "@/features/hr/employees/detail/professional-info-section";
import { BankDetailsSection } from "@/features/hr/employees/detail/bank-details-section";

const formSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(2, "First name must be at least 2 characters")
      .max(50, "First name must be at most 50 characters")
      .regex(
        /^[A-Za-z\s'-]+$/,
        "Only alphabetic characters, spaces, hyphens and apostrophes are allowed",
      )
      .refine(
        (v) => !/\s{2,}/.test(v),
        "First name cannot have consecutive spaces",
      ),
    lastName: z
      .string()
      .trim()
      .min(2, "Last name must be at least 2 characters")
      .max(50, "Last name must be at most 50 characters")
      .regex(
        /^[A-Za-z\s'-]+$/,
        "Only alphabetic characters, spaces, hyphens and apostrophes are allowed",
      )
      .refine(
        (v) => !/\s{2,}/.test(v),
        "Last name cannot have consecutive spaces",
      ),
    role: z.string(),
    designation: z
      .string()
      .trim()
      .min(2, "Designation must be at least 2 characters")
      .max(100, "Designation must be at most 100 characters")
      .refine(
        (v) => /[a-zA-Z]/.test(v),
        "Designation must contain at least one letter",
      )
      .refine(
        (v) => !/\s{2,}/.test(v),
        "Designation cannot have consecutive spaces",
      )
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
        const digits = val.replace(/\D/g, "");
        return digits.length >= 7 && digits.length <= 15;
      }, "Phone number must be 7–15 digits")
      .optional()
      .or(z.literal("")),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
    joiningDate: z.date().optional(),
    taxId: z
      .string()
      .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN format (e.g. ABCDE1234F)")
      .optional()
      .or(z.literal("")),
    monthlySalary: z
      .number()
      .min(0, "Salary cannot be negative")
      .max(9_999_999, "Salary exceeds maximum allowed value")
      .optional(),
    bankAccount: z
      .string()
      .regex(/^\d{9,18}$/, "Account number must be 9–18 digits")
      .optional()
      .or(z.literal("")),
    bankName: z
      .string()
      .regex(/^[A-Za-z\s]+$/, "Bank name must contain only letters")
      .optional()
      .or(z.literal("")),
    branch: z
      .string()
      .regex(/^[A-Za-z\s]+$/, "Branch name must contain only letters")
      .optional()
      .or(z.literal("")),
    ifsc: z
      .string()
      .regex(
        /^[A-Z]{4}0[A-Z0-9]{6}$/,
        "Invalid IFSC code format (e.g. SBIN0001234)",
      )
      .optional()
      .or(z.literal("")),
    accountHolder: z
      .string()
      .trim()
      .min(2, "Account holder name must be at least 2 characters")
      .refine((v) => /[A-Za-z]/.test(v), "Account holder name must contain letters and match the bank account name.")
      .refine((v) => /^[A-Za-z\s'.,-]+$/.test(v), "Account holder name can only contain letters, spaces, hyphens, apostrophes, and periods")
      .refine((v) => !/^\s+$/.test(v), "Account holder name cannot be whitespace only")
      .optional()
      .or(z.literal("")),
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
  skills?: { name: string; level: number }[] | null;
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
  const { data: orgRoles } = useRoles();
  const assignableRoles = useMemo(
    () => (orgRoles || []).filter((r) => r.slug !== "CEO"),
    [orgRoles],
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
      joiningDate: employee.joiningDate
        ? new Date(employee.joiningDate)
        : undefined,
      taxId: employee.taxId || "",
      monthlySalary: employee.monthlySalary
        ? Number(employee.monthlySalary)
        : undefined,
      bankAccount: employee.bankDetails?.accountNumber || "",
      bankName: employee.bankDetails?.bankName || "",
      branch: employee.bankDetails?.branch || "",
      ifsc: employee.bankDetails?.ifsc || "",
      accountHolder: employee.bankDetails?.accountHolder || "",
    },
  });

  const onSubmit = useCallback(
    async (values: EmployeeFormValues) => {
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
        },
      );
    },
    [employee.id, router, updateProfileMutation],
  );

  const handleCancel = useCallback(() => router.back(), [router]);

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col flex-1 min-h-0"
      >
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-5">
              <PersonalInfoSection />
            </div>
            <Separator />
            <div className="p-5">
              <ProfessionalInfoSection assignableRoles={assignableRoles} />
            </div>
            <Separator />
            <div className="p-5">
              <BankDetailsSection />
            </div>
          </div>
          <div className="shrink-0 flex justify-end gap-2 px-5 py-3.5 bg-muted/30 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="h-8 gap-1.5"
              onClick={handleCancel}
              disabled={updateProfileMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              className="h-8 gap-1.5"
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
