"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useInviteUser } from "@/lib/api/hooks/users";
import { useOrgBranches, useOrgDepartments } from "@/lib/api/hooks/org-hierarchy";
import { getApiError } from "@/lib/api-client";
import { toast } from "sonner";
import { CheckCircle2, Mail, ChevronDown } from "lucide-react";

const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.string().min(1, "Please select a role"),
  employeeId: z.string().optional(),
  branchId: z.string().optional(),
  departmentId: z.string().optional(),
  startDate: z.string().optional(),
  welcomeMessage: z.string().optional(),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

interface UserInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLES = [
  { value: "MEMBER", label: "Member" },
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "HR", label: "HR" },
];

export function UserInviteDialog({ open, onOpenChange }: UserInviteDialogProps) {
  const [invited, setInvited] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const { mutate: inviteUser, isPending } = useInviteUser();
  const { data: branchesData } = useOrgBranches();
  const { data: departmentsData } = useOrgDepartments();

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      role: "",
      employeeId: "",
      branchId: "",
      departmentId: "",
      startDate: "",
      welcomeMessage: "",
    },
  });

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      form.reset();
      setInvited(false);
      setShowOptional(false);
    }
    onOpenChange(isOpen);
  }

  function onSubmit(values: InviteFormValues) {
    inviteUser(
      {
        email: values.email,
        role: values.role,
        ...(values.employeeId ? { employeeId: values.employeeId } : {}),
        ...(values.branchId ? { branchId: Number(values.branchId) } : {}),
        ...(values.departmentId ? { departmentId: Number(values.departmentId) } : {}),
        ...(values.startDate ? { startDate: values.startDate } : {}),
        ...(values.welcomeMessage ? { welcomeMessage: values.welcomeMessage } : {}),
      },
      {
        onSuccess: () => {
          setInvited(true);
          toast.success("Invitation sent!");
        },
        onError: (error) => {
          toast.error(getApiError(error));
        },
      }
    );
  }

  function handleToggleOptional() {
    setShowOptional((v) => !v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
        </DialogHeader>

        {invited ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <p className="font-medium text-sm">Invitation sent!</p>
            <p className="text-xs text-muted-foreground">
              The user will receive an email with instructions to join.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                form.reset();
                setInvited(false);
                setShowOptional(false);
              }}
            >
              Invite another
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          placeholder="colleague@company.com"
                          type="email"
                          className="pl-9"
                          autoComplete="off"
                        />
                      </div>
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
                          <SelectValue placeholder="Select a role" />
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

              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={handleToggleOptional}
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${showOptional ? "rotate-180" : ""}`}
                />
                {showOptional ? "Hide" : "Show"} optional details
              </button>

              {showOptional && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="employeeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Employee ID</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="EMP-001" className="h-8 text-xs" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Start Date</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" className="h-8 text-xs" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="branchId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Branch</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(branchesData?.data ?? []).map((b) => (
                                <SelectItem key={b.id} value={String(b.id)}>
                                  {b.name}
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
                      name="departmentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Department</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(departmentsData?.data ?? []).map((d) => (
                                <SelectItem key={d.id} value={String(d.id)}>
                                  {d.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="welcomeMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Welcome Message</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Optional welcome message..."
                            className="min-h-[64px] resize-none text-xs"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Sending..." : "Send invitation"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
