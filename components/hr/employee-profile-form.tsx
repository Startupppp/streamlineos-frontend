"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useUpdateProfile } from "../../lib/hooks/trpc-hooks";

const profileSchema = z.object({
  designation: z.string().min(2, "Designation must be at least 2 characters."),
  departmentId: z.string().optional(),
  phone: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface EmployeeProfileFormProps {
  userId: string;
  initialData: {
    designation?: string | null;
    departmentId?: number | null;
    phone?: string | null;
  };
  departments: { id: number; name: string }[];
}

export function EmployeeProfileForm({
  userId,
  initialData,
  departments,
}: EmployeeProfileFormProps) {
  const router = useRouter();

  const updateProfile = useUpdateProfile({
    onSuccess: () => {
      toast.success("Profile updated successfully");
      router.refresh();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update profile");
    },
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      designation: initialData.designation || "",
      departmentId: initialData.departmentId?.toString() || "",
      phone: initialData.phone || "",
    },
  });

  function onSubmit(data: ProfileFormValues) {
    updateProfile.mutate({
      userId,
      designation: data.designation,
      departmentId: data.departmentId ? parseInt(data.departmentId) : undefined,
      phone: data.phone,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="designation"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Designation</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="bg-black/20 border-white/10 text-white"
                />
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
              <FormLabel className="text-white">Department</FormLabel>
              <FormControl>
                <select
                  {...field}
                  className="flex h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold"
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </option>
                  ))}
                </select>
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
              <FormLabel className="text-white">Phone</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  className="bg-black/20 border-white/10 text-white"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full bg-gold text-black hover:bg-yellow-500"
          disabled={updateProfile.isPending}
        >
          {updateProfile.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </Form>
  );
}
