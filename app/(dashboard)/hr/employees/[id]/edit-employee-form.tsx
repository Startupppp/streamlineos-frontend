"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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

const formSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  role: z.enum(["ADMIN", "MEMBER", "OWNER"]), // Added OWNER just in case, though usually manual
});

interface EditEmployeeFormProps {
  employee: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: string;
  };
}

export function EditEmployeeForm({ employee }: EditEmployeeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: employee.firstName || "",
      lastName: employee.lastName || "",
      role: (employee.role as "ADMIN" | "MEMBER" | "OWNER") || "MEMBER",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    const result = await updateEmployee({
        id: employee.id,
        firstName: values.firstName,
        lastName: values.lastName,
        role: values.role as "ADMIN" | "MEMBER",
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
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
    <Card className="col-span-1 md:col-span-2">
        <CardHeader>
            <CardTitle>Employee Details</CardTitle>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                            <Input placeholder="John" {...field} />
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
                            <Input placeholder="Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>

                <div className="grid gap-2">
                    <FormLabel>Email Address</FormLabel>
                     <Input disabled value={employee.email} className="bg-muted" />
                     <p className="text-[0.8rem] text-muted-foreground">Email cannot be changed.</p>
                </div>

                <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="MEMBER">Member (Employee)</SelectItem>
                            <SelectItem value="ADMIN">Admin (HR/Manager)</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormDescription>
                            Members have restricted access. Admins can manage employees.
                        </FormDescription>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-4 mt-6">
                    <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
                    <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                    </Button>
                </div>
                </form>
            </Form>
        </CardContent>
    </Card>
    </div>
  );
}
