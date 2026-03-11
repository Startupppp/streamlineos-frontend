"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { updateEmployee } from "@/server/actions/hr-actions";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { api } from "@/trpc/react";
import { DepartmentCombobox } from "@/components/hr/department-combobox";

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
  bankAccount: z.string().optional(),
  bankName: z.string().optional(),
  branch: z.string().optional(),
  ifsc: z.string().optional(),
  accountHolder: z.string().optional(),
});

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
  const form = useForm<z.infer<typeof formSchema>>({
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
      bankAccount: employee.bankDetails?.accountNumber || "",
      bankName: employee.bankDetails?.bankName || "",
      branch: employee.bankDetails?.branch || "",
      ifsc: employee.bankDetails?.ifsc || "",
      accountHolder: employee.bankDetails?.accountHolder || "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    const skillsArray = values.skills ? values.skills.split(",").map(s => s.trim()).filter(Boolean) : [];

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
        bankDetails: values.bankAccount ? {
            accountNumber: values.bankAccount,
            bankName: values.bankName || "",
            branch: values.branch || "",
            ifsc: values.ifsc || "",
            accountHolder: values.accountHolder || "",
        } : undefined,
    });
    setLoading(false);

    if (result.success) {
      toast.success("Employee updated successfully!");
      router.push("/hr/employees");
      router.refresh();
    } else {
        toast.error(result.error || "Failed to update employee");
    }
  }

  return (
    <div className="grid gap-4">
    <Card>
        <CardHeader>
            <CardTitle>Edit Employee Profile</CardTitle>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="lastName"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Phone</FormLabel>
                                <FormControl>
                                <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="gender"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Gender</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select gender" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    <SelectItem value="MALE">Male</SelectItem>
                                    <SelectItem value="FEMALE">Female</SelectItem>
                                    <SelectItem value="OTHER">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">Professional Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         
                         
                         
                          <FormField
                            control={form.control}
                            name="bankAccount"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Account Number</FormLabel>
                                <FormControl>
                                <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="bankName"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Bank Name</FormLabel>
                                <FormControl>
                                <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="branch"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Branch</FormLabel>
                                <FormControl>
                                <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="ifsc"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>IFSC Code</FormLabel>
                                <FormControl>
                                <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        
                         <FormField
                            control={form.control}
                            name="designation"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Designation</FormLabel>
                                <FormControl>
                                <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="departmentId"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Department</FormLabel>
                                <FormControl>
                                    <DepartmentCombobox
                                        value={field.value ?? null}
                                        onValueChange={(val) => field.onChange(val ?? undefined)}
                                        placeholder="Select Department"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Role</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    <SelectItem value="HR">HR</SelectItem>
                                    <SelectItem value="SALES">Sales</SelectItem>
                                    <SelectItem value="CUSTOMER_SUPPORT">Customer Support</SelectItem>
                                    <SelectItem value="ENGINEERING">Engineering</SelectItem>
                                    <SelectItem value="DESIGN">Design</SelectItem>
                                    <SelectItem value="VIDEO_EDITOR">Video Editor</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="joiningDate"
                            render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Joining Date</FormLabel>
                                <FormControl>
                                     <Input type="date" 
                                        value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                                     />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Employee
                    </Button>
                </div>
                </form>
            </Form>
        </CardContent>
    </Card>
    </div>
  );
}
