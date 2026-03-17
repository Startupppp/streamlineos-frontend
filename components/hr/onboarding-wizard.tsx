"use client";

import { useState, useMemo } from "react";
import { useForm, FieldPath, DefaultValues, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { onboardEmployeeInputSchema } from "../../lib/validations/hr";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Card, CardContent } from "../ui/card";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "../../lib/utils";
import { format } from "date-fns";
import {
  CalendarIcon,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Lightbulb,
} from "lucide-react";
import { api } from "../../trpc/react";
import { useRolesList } from "../../lib/hooks/roles-hooks";
import { useRouter } from "next/navigation";

const STEPS = [
  { id: 1, label: "PERSONAL INFO" },
  { id: 2, label: "JOB DETAILS" },
  { id: 3, label: "SKILLS & PAY" },
  { id: 4, label: "BANKING" },
  { id: 5, label: "REVIEW" },
];

const STEP_DETAILS: Record<number, { title: string; description: string }> = {
  1: { title: "Personal Information", description: "Enter the employee's basic personal details to get started with onboarding." },
  2: { title: "Role & Department", description: "Define their position, department, and system access level within the organization." },
  3: { title: "Skills, Experience & Salary", description: "Professional background, qualifications, and monthly compensation details." },
  4: { title: "Banking Details", description: "Bank account information required for payroll processing." },
  5: { title: "Review & Submit", description: "Review all the information entered before finalizing the onboarding." },
};

const COMMON_ROLE_DEPARTMENTS = [
  "HR",
  "Sales",
  "Customer Support",
  "Engineering",
  "Design",
  "Video Editing",
];


export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const router = useRouter();
  const { data: departments } = api.hr.getDepartments.useQuery();
  const { data: orgRoles } = useRolesList();
  const assignableRoles = useMemo(
    () => (orgRoles || []).filter((r) => r.slug !== "CEO"),
    [orgRoles]
  );
  const allDepartmentOptions = useMemo(() => {
    const dbDeptNames = new Set(departments?.map(d => d.name.toLowerCase()) || []);
    const commonRoles = COMMON_ROLE_DEPARTMENTS
      .filter(role => !dbDeptNames.has(role.toLowerCase()))
      .map((role, idx) => ({ id: -(idx + 1), name: role, isCommon: true }));
    return [
      ...(departments || []),
      ...commonRoles
    ];
  }, [departments]);
  const onboardEmployee = api.hr.onboardEmployee.useMutation({
    onSuccess: () => {
      toast.success("Employee onboarding initiated successfully!");
      router.push("/hr/employees");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to onboard employee");
    },
  });

  type FormValues = z.infer<typeof onboardEmployeeInputSchema>;

  const defaultFormValues = useMemo(() => {
    const base = {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      whatsappSameAsPhone: true,
      whatsappNumber: "",
      gender: "MALE",
      password: "",
      designation: "",
      departmentId: undefined,
      role: "ENGINEERING",
      employeeId: "",
      joiningDate: new Date(),
      dateOfBirth: undefined,
      skills: "",
      experienceYears: 0,
      taxId: "",
      monthlySalary: undefined,
      bankDetails: {
        accountNumber: "",
        bankName: "",
        branch: "",
        ifsc: "",
        accountHolder: ""
      }
    };
    return base;
  }, [assignableRoles]);

  const form = useForm<FormValues>({
    resolver: zodResolver(onboardEmployeeInputSchema) as unknown as Resolver<FormValues>,
    defaultValues: defaultFormValues as DefaultValues<FormValues>,
    mode: "onChange",
  });

  const { trigger, getValues, watch } = form;

  const nextStep = async () => {
    let fieldsToValidate: FieldPath<FormValues>[] = [];
    switch (currentStep) {
      case 1: fieldsToValidate = ['firstName', 'lastName', 'email', 'phone', 'gender', 'dateOfBirth']; break;
      case 2: fieldsToValidate = ['designation', 'departmentId', 'role', 'joiningDate']; break;
      case 3: fieldsToValidate = ['skills', 'experienceYears', 'taxId']; break;
      case 4: fieldsToValidate = ['bankDetails.accountNumber', 'bankDetails.bankName', 'bankDetails.ifsc', 'bankDetails.accountHolder']; break;
    }
    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      const nextStepNum = Math.min(STEPS.length, currentStep + 1);
      setCurrentStep(nextStepNum);
    }
  };

  const prevStep = () => {
    const prevStepNum = Math.max(1, currentStep - 1);
    setCurrentStep(prevStepNum);
  };

  const onSubmit = (data: z.infer<typeof onboardEmployeeInputSchema>) => {
    onboardEmployee.mutate(data);
  };

  const nextStepLabel = currentStep < STEPS.length ? STEPS[currentStep]?.label : "";

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">Onboard New Employee</h1>
        <p className="text-sm text-muted-foreground">Complete the steps below to add a new team member to the organization.</p>
      </div>

      {/* Step Circles with Connecting Lines */}
      <div className="mb-10">
        <div className="flex items-center justify-between relative">
          {/* Connecting line behind circles */}
          <div className="absolute top-5 left-0 right-0 h-[2px] bg-border z-0" />
          <div
            className="absolute top-5 left-0 h-[2px] z-0 transition-all duration-500"
            style={{
              width: `${((Math.min(currentStep, STEPS.length) - 1) / (STEPS.length - 1)) * 100}%`,
              background: "linear-gradient(90deg, #bd882c, #0f2b7f)",
            }}
          />

          {STEPS.map((step) => {
            const isCompleted = step.id < currentStep;
            const isActive = step.id === currentStep;
            const isUpcoming = step.id > currentStep;

            return (
              <div key={step.id} className="flex flex-col items-center gap-2 relative z-10">
                <motion.div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300",
                    isCompleted
                      ? "bg-[#bd882c] border-[#bd882c] text-white"
                      : isActive
                        ? "bg-[#0f2b7f] border-[#0f2b7f] text-white shadow-lg shadow-[#0f2b7f]/30"
                        : "bg-card border-border text-muted-foreground"
                  )}
                  animate={isActive ? { scale: [1, 1.08, 1] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    step.id
                  )}
                </motion.div>
                <span className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider hidden md:block",
                  isCompleted
                    ? "text-[#bd882c]"
                    : isActive
                      ? "text-[#0f2b7f] dark:text-blue-400"
                      : "text-muted-foreground/60"
                )}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Card */}
      <Card className="border-border shadow-xl overflow-hidden">
        <CardContent className="p-0">
          {/* Card Header with step badge */}
          <div className="px-6 md:px-8 pt-6 md:pt-8 pb-4 border-b border-border bg-muted/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">{STEP_DETAILS[currentStep]?.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{STEP_DETAILS[currentStep]?.description}</p>
              </div>
              <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#0f2b7f]/10 text-[#0f2b7f] dark:bg-[#0f2b7f]/20 dark:text-blue-300 border border-[#0f2b7f]/20">
                Step {currentStep} of {STEPS.length}
              </span>
            </div>
          </div>

          {/* Form Content */}
          <div className="px-6 md:px-8 py-6 md:py-8 min-h-[380px]">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-6"
                  >
                    {currentStep === 1 && (
                      <div className="grid gap-5 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name <span className="text-red-500">*</span></FormLabel>
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
                              <FormLabel>Last Name <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input placeholder="Doe" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="john.doe@company.com" {...field} />
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
                              <FormLabel>Phone Number <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input placeholder="+91 9876543210" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="whatsappSameAsPhone"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center gap-3 space-y-0 pt-2">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={field.onChange}
                                  className="h-4 w-4 rounded border-gray-300 accent-[#bd882c]"
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal cursor-pointer">WhatsApp same as phone</FormLabel>
                            </FormItem>
                          )}
                        />
                        {!form.watch("whatsappSameAsPhone") && (
                          <FormField
                            control={form.control}
                            name="whatsappNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>WhatsApp Number</FormLabel>
                                <FormControl>
                                  <Input placeholder="+91 9876543210" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        <FormField
                          control={form.control}
                          name="gender"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Gender <span className="text-red-500">*</span></FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Gender" />
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
                        <FormField
                          control={form.control}
                          name="dateOfBirth"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date of Birth <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                  value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                                  onChange={(e) => {
                                    const date = e.target.value ? new Date(e.target.value) : null;
                                    field.onChange(date);
                                  }}
                                  max={format(new Date(), "yyyy-MM-dd")}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Initial Password (Optional)</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Set initial password..." {...field} />
                              </FormControl>
                              <FormDescription className="text-xs">If left blank, user will set via invite.</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {currentStep === 2 && (
                      <div className="grid gap-5 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="departmentId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Department <span className="text-red-500">*</span></FormLabel>
                              <Select
                                value={field.value !== undefined && field.value !== null ? field.value.toString() : ""}
                                onValueChange={(val) => {
                                  if (val && val !== "") {
                                    const numVal = parseInt(val, 10);
                                    if (!isNaN(numVal)) {
                                      field.onChange(numVal);
                                      form.trigger("departmentId");
                                    }
                                  } else {
                                    field.onChange(undefined);
                                  }
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Department" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {departments?.map((dept) => (
                                    <SelectItem key={dept.id} value={dept.id.toString()}>
                                      {dept.name}
                                    </SelectItem>
                                  ))}
                                  {allDepartmentOptions
                                    .filter(dept => dept.id < 0)
                                    .map((dept) => (
                                      <SelectItem key={dept.id} value={dept.id.toString()}>
                                        {dept.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              <FormDescription className="text-xs">
                                Select from existing departments or common roles.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="designation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Designation <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Senior Software Engineer" {...field} />
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
                              <FormLabel>System Role <span className="text-red-500">*</span></FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select Role" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {assignableRoles.map((role) => (
                                    <SelectItem key={role.slug} value={role.slug}>
                                      {role.name}
                                    </SelectItem>
                                  ))}
                                  {assignableRoles.length === 0 && (
                                    <>
                                      <SelectItem value="ENGINEERING">Engineering</SelectItem>
                                      <SelectItem value="HR">HR</SelectItem>
                                      <SelectItem value="SALES">Sales</SelectItem>
                                      <SelectItem value="CUSTOMER_SUPPORT">Customer Support</SelectItem>
                                      <SelectItem value="DESIGN">Design</SelectItem>
                                      <SelectItem value="VIDEO_EDITOR">Video Editor</SelectItem>
                                      <SelectItem value="DIGITAL_MARKETING">Digital Marketing</SelectItem>
                                    </>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormDescription className="text-xs">
                                Permission level for system access.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="joiningDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Joining Date <span className="text-red-500">*</span></FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant={"outline"}
                                      className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                      )}
                                    >
                                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) =>
                                      date > new Date() || date < new Date("1900-01-01")
                                    }
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="employeeId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Employee ID</FormLabel>
                              <FormControl>
                                <Input placeholder="Auto-generated if blank" {...field} />
                              </FormControl>
                              <FormDescription className="text-xs">
                                Leave blank to auto-generate, or enter a custom employee ID.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {currentStep === 3 && (
                      <div className="space-y-5">
                        <FormField
                          control={form.control}
                          name="skills"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Skills (Comma Separated)</FormLabel>
                              <FormControl>
                                <Input placeholder="React, Node.js, Leadership..." {...field} />
                              </FormControl>
                              <FormDescription>Enter skills separated by commas.</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid md:grid-cols-2 gap-5">
                          <FormField
                            control={form.control}
                            name="experienceYears"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Years of Experience</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    placeholder="5.5"
                                    value={field.value ?? ""}
                                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                    ref={field.ref}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="taxId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>PAN Number</FormLabel>
                                <FormControl>
                                  <Input placeholder="ABCDE1234F" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="pt-4 border-t border-border">
                          <h3 className="text-base font-semibold mb-4">Salary Information</h3>
                          <FormField
                            control={form.control}
                            name="monthlySalary"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Monthly Salary (CTC) <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-muted-foreground">&#8377;</span>
                                    <Input
                                      type="number"
                                      placeholder="25000"
                                      value={field.value ?? ""}
                                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                      onBlur={field.onBlur}
                                      name={field.name}
                                      ref={field.ref}
                                      className="pl-8"
                                    />
                                  </div>
                                </FormControl>
                                <FormDescription>
                                  Salary breakdown: Basic (50%) + HRA (25%) + Special Allowance (25%) - Professional Tax (&#8377;200)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {form.watch("monthlySalary") && Number(form.watch("monthlySalary")) > 0 && (
                            <div className="mt-4 p-4 bg-muted/40 rounded-lg border text-sm">
                              <div className="grid grid-cols-2 gap-2">
                                <span className="text-muted-foreground">Basic Pay:</span>
                                <span className="font-medium">&#8377;{(Number(form.watch("monthlySalary")) * 0.5).toLocaleString()}</span>
                                <span className="text-muted-foreground">HRA:</span>
                                <span className="font-medium">&#8377;{(Number(form.watch("monthlySalary")) * 0.25).toLocaleString()}</span>
                                <span className="text-muted-foreground">Special Allowance:</span>
                                <span className="font-medium">&#8377;{(Number(form.watch("monthlySalary")) * 0.25).toLocaleString()}</span>
                                <span className="text-muted-foreground">Professional Tax:</span>
                                <span className="font-medium text-red-600">-&#8377;200</span>
                                <span className="text-muted-foreground font-semibold border-t pt-2">Net Salary:</span>
                                <span className="font-bold text-green-600 border-t pt-2">&#8377;{(Number(form.watch("monthlySalary")) - 200).toLocaleString()}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {currentStep === 4 && (
                      <div className="grid gap-5 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="bankDetails.accountHolder"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Account Holder Name <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input placeholder="Name as per bank records" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="bankDetails.bankName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bank Name <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Chase, HDFC" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="bankDetails.branch"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Branch Name <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Down Town Branch" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="bankDetails.accountNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Account Number <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input placeholder="XXXX-XXXX-XXXX" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="bankDetails.ifsc"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Routing / IFSC Code <span className="text-red-500">*</span></FormLabel>
                              <FormControl>
                                <Input placeholder="Routing / IFSC" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {currentStep === 5 && (
                      <div className="space-y-6">
                        <div className="text-center mb-4">
                          <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Check className="w-7 h-7" />
                          </div>
                          <h2 className="text-xl font-bold">Ready to Onboard?</h2>
                          <p className="text-sm text-muted-foreground">Review the details below before submitting.</p>
                        </div>

                        <div className="bg-muted/30 rounded-lg p-5 space-y-3 border text-sm">
                          <div className="grid grid-cols-2 gap-3">
                            <div><span className="text-muted-foreground">Full Name:</span> <span className="font-medium">{getValues("firstName")} {getValues("lastName")}</span></div>
                            <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{getValues("email")}</span></div>
                            <div><span className="text-muted-foreground">Role:</span> <span className="font-medium">{getValues("designation")}</span></div>
                            <div><span className="text-muted-foreground">Department:</span> <span className="font-medium">{allDepartmentOptions?.find(d => d.id === getValues("departmentId"))?.name}</span></div>
                            <div><span className="text-muted-foreground">Joining:</span> <span className="font-medium">{format(getValues("joiningDate"), "PPP")}</span></div>
                          </div>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-4 rounded-lg flex gap-3 text-sm text-amber-800 dark:text-amber-200">
                          <Lightbulb className="w-5 h-5 shrink-0 mt-0.5" />
                          <p>By clicking submit, the employee account will be created, and they will be added to the onboarding workflow automatically.</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Bottom Action Bar */}
                <div className="flex items-center justify-between pt-6 border-t border-border mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1 || onboardEmployee.isPending}
                    className="gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous Step
                  </Button>

                  <div className="flex items-center gap-3">
                    {currentStep < 5 ? (
                      <Button
                        type="button"
                        onClick={nextStep}
                        className="gap-1.5 text-white"
                        style={{ background: "linear-gradient(135deg, #bd882c, #d4a04a)" }}
                      >
                        Continue to {nextStepLabel}
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={onboardEmployee.isPending}
                        className="gap-1.5 text-white min-w-[140px]"
                        style={{ background: "linear-gradient(135deg, #16a34a, #22c55e)" }}
                      >
                        {onboardEmployee.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            Submit
                            <Check className="w-4 h-4" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            </Form>
          </div>
        </CardContent>
      </Card>

      {/* Onboarding Tip */}
      <div className="mt-6 flex items-start gap-3 p-4 rounded-lg bg-muted/40 border border-border text-sm text-muted-foreground">
        <Lightbulb className="w-5 h-5 text-[#bd882c] shrink-0 mt-0.5" />
        <div>
          <span className="font-medium text-foreground">Onboarding Tip:</span>{" "}
          Your progress is auto-saved. You can close this page and resume later from where you left off.
        </div>
      </div>
    </div>
  );
}
