"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useUpdateUser } from "@/hooks/api/users";
import type { User } from "@/hooks/api/users";
import { getApiError } from "@/lib/api-client";
import { toast } from "sonner";

const editSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  designation: z.string().optional(),
  phone: z.string().optional(),
  role: z.string().min(1, "Role is required"),
  bio: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyRelation: z.string().optional(),
  emergencyPhone: z.string().optional(),
  emergencyEmail: z.string().email("Invalid email").optional().or(z.literal("")),
});

type EditFormValues = z.infer<typeof editSchema>;

interface UserEditFormProps {
  user: User;
  onSuccess: () => void;
  onCancel: () => void;
}

const ROLES = [
  { value: "MEMBER", label: "Member" },
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "HR", label: "HR" },
  { value: "OWNER", label: "Owner" },
];

const RELATIONS = ["Spouse", "Parent", "Sibling", "Child", "Friend", "Other"];

export function UserEditForm({ user, onSuccess, onCancel }: UserEditFormProps) {
  const { mutate: updateUser, isPending } = useUpdateUser();

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      designation: user.designation ?? "",
      phone: user.phone ?? "",
      role: user.role,
      bio: user.bio ?? "",
      emergencyName: user.emergencyContact?.name ?? "",
      emergencyRelation: user.emergencyContact?.relation ?? "",
      emergencyPhone: user.emergencyContact?.phone ?? "",
      emergencyEmail: user.emergencyContact?.email ?? "",
    },
  });

  function onSubmit(values: EditFormValues) {
    const emergencyContact =
      values.emergencyName && values.emergencyRelation && values.emergencyPhone
        ? {
            name: values.emergencyName,
            relation: values.emergencyRelation,
            phone: values.emergencyPhone,
            email: values.emergencyEmail || undefined,
          }
        : undefined;

    updateUser(
      {
        userId: user.id,
        data: {
          firstName: values.firstName,
          lastName: values.lastName,
          designation: values.designation,
          phone: values.phone,
          role: values.role,
          bio: values.bio,
          emergencyContact,
        },
      },
      {
        onSuccess: () => {
          toast.success("User updated");
          onSuccess();
        },
        onError: (e) => toast.error(getApiError(e)),
      }
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="First name" />
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
                  <Input {...field} placeholder="Last name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="designation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Designation</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. Senior Engineer" />
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
                <PhoneInput defaultCountry="IN" {...field} />
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
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Short bio..."
                  className="min-h-[80px] resize-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Emergency Contact</p>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="emergencyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Full Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Contact name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="emergencyRelation"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Relationship</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {RELATIONS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="emergencyPhone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Phone</FormLabel>
                <FormControl>
                  <PhoneInput defaultCountry="IN" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="emergencyEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Email (optional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="email@example.com" type="email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
