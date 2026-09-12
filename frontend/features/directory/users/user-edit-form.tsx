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
import { LoadingButton } from "@/components/ui/loading-button";
import { Separator } from "@/components/ui/separator";
import { SheetBody, SheetFooter } from "@/components/ui/sheet";
import { useUpdateUser } from "@/hooks/api/users";
import { useCanManageOrganizationMembership } from "@/hooks/api/access";
import type { User } from "@/hooks/api/users";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import {
  ORG_OWNER_ROLE,
  USER_INVITE_ROLES,
  toStructuralRole,
} from "@/lib/constants/user-invite-roles";
import { useEmploymentFacts } from "@/hooks/api/directory/employment";

const USER_EDIT_FORM_ID = "user-edit-form";

const editSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  designation: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(["OWNER", "ORG_ADMIN", "MEMBER"]),
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

const ROLES = USER_INVITE_ROLES;

const RELATIONS = ["Spouse", "Parent", "Sibling", "Child", "Friend", "Other"];

export function UserEditForm({ user, onSuccess, onCancel }: UserEditFormProps) {
  const { mutate: updateUser, isPending } = useUpdateUser();
  const canManageMembership = useCanManageOrganizationMembership();

  const isOwner = user.role === ORG_OWNER_ROLE;

  const { byUserId: employmentByUserId } = useEmploymentFacts([user.id]);
  const employment = employmentByUserId.get(user.id);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      designation: employment?.designation ?? "",
      phone: user.phone ?? "",
      role: toStructuralRole(user.role),
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
          ...(canManageMembership ? { role: values.role } : {}),
          bio: values.bio,
          emergencyContact,
        },
      },
      {
        onSuccess: () => {
          toast.success("User updated");
          onSuccess();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }

  return (
    <Form {...form}>
      <SheetBody className="space-y-4 px-6 py-5">
        <form
          id={USER_EDIT_FORM_ID}
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4"
        >
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name <span className="text-destructive">*</span></FormLabel>
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
                <FormLabel>Last Name <span className="text-destructive">*</span></FormLabel>
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

        {canManageMembership ? (
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role <span className="text-destructive">*</span></FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isOwner}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isOwner ? (
                      <SelectItem value={ORG_OWNER_ROLE} disabled>
                        Owner — transfer ownership to change
                      </SelectItem>
                    ) : (
                      ROLES.map((roleOption) => (
                        <SelectItem key={roleOption.value} value={roleOption.value}>
                          {roleOption.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

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
                    {RELATIONS.map((relation) => (
                      <SelectItem key={relation} value={relation}>
                        {relation}
                      </SelectItem>
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
        </form>
      </SheetBody>

      <SheetFooter className="shrink-0 gap-2 border-t border-border bg-muted/30 px-6 py-4">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
        <LoadingButton
          type="submit"
          form={USER_EDIT_FORM_ID}
          className="flex-1"
          isPending={isPending}
          loadingText="Saving…"
        >
          Save changes
        </LoadingButton>
      </SheetFooter>
    </Form>
  );
}
