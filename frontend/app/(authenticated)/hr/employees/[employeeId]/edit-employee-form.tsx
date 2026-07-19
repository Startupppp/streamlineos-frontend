"use client";

import { useCallback, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useRouter } from "next/navigation";
import { useUpdateProfile } from "@/hooks/api/hr";
import { Save } from "lucide-react";
import { useRoles } from "@/hooks/api/roles";
import { PersonalInfoSection } from "@/features/hr/employees/detail/personal-info-section";
import { ProfessionalInfoSection } from "@/features/hr/employees/detail/professional-info-section";
import { BankDetailsSection } from "@/features/hr/employees/detail/bank-details-section";

const hasLetterOrDigit = (v: string) => /[\p{L}\p{N}]/u.test(v);

const formSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required")
    .max(80, "First name must be at most 80 characters")
    .refine(hasLetterOrDigit, "First name must contain a letter or number"),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required")
    .max(80, "Last name must be at most 80 characters")
    .refine(hasLetterOrDigit, "Last name must contain a letter or number"),
  role: z.string(),
  designation: z
    .string()
    .trim()
    .max(120, "Designation must be at most 120 characters")
    .refine((v) => v === "" || hasLetterOrDigit(v), "Designation must contain a letter or number")
    .optional()
    .or(z.literal("")),
  departmentId: z.number().optional(),
  phone: z
    .string()
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
    .trim()
    .refine(
      (v) => v === "" || /^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/i.test(v),
      "Invalid PAN format (e.g. ABCDE1234F)",
    )
    .optional()
    .or(z.literal("")),
  monthlySalary: z
    .number()
    .min(0, "Salary cannot be negative")
    .max(9_999_999, "Salary exceeds maximum allowed value")
    .optional(),
  bankAccount: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{6,20}$/.test(v), "Account number must be 6–20 digits")
    .optional()
    .or(z.literal("")),
  bankName: z.string().trim().max(100).optional().or(z.literal("")),
  branch: z.string().trim().max(100).optional().or(z.literal("")),
  ifsc: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^[A-Za-z]{4}0[A-Za-z0-9]{6}$/i.test(v),
      "Invalid IFSC code format (e.g. SBIN0001234)",
    )
    .optional()
    .or(z.literal("")),
  accountHolder: z
    .string()
    .trim()
    .max(120)
    .refine((v) => v === "" || hasLetterOrDigit(v), "Account holder name looks invalid")
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
            router.refresh();
            return "Employee updated successfully!";
          },
          error: (err: unknown) => getErrorMessage(err),
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
        className="flex flex-col"
      >
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] backdrop-blur-sm">
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
          <div className="shrink-0 flex justify-end gap-2 px-5 py-3.5 bg-muted/30 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="gap-1.5"
              onClick={handleCancel}
              disabled={updateProfileMutation.isPending}
            >
              Cancel
            </Button>
            <LoadingButton
              size="sm"
              type="submit"
              className="gap-1.5"
              isPending={updateProfileMutation.isPending}
              loadingText="Saving..."
            >
              <Save className="h-3.5 w-3.5" />
              Save Changes
            </LoadingButton>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
