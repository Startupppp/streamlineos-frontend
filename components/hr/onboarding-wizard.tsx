"use client";

import { useState } from "react";
import { useForm, FieldPath, DefaultValues, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { onboardEmployeeInputSchema } from "../../lib/validations/hr";

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
import { CalendarIcon, CheckCircle2, ChevronRight, ChevronLeft, Loader2, User, Briefcase, CreditCard, CheckSquare } from "lucide-react";

// Hook needed
import { api } from "../../trpc/react"; // Assuming we can use direct api or hooks
import { useRouter } from "next/navigation";

// Steps definition
const STEPS = [
  { id: 1, title: "Personal Details", icon: User },
  { id: 2, title: "Role & Department", icon: Briefcase },
  { id: 3, title: "Skills & Experience", icon: CheckSquare },
  { id: 4, title: "Banking Info", icon: CreditCard },
  { id: 5, title: "Review & Submit", icon: CheckCircle2 },
];

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const router = useRouter();

  // Fetch departments for dropdown
  const { data: departments } = api.hr.getDepartments.useQuery();

  // Mutation
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

  const form = useForm<FormValues>({
    resolver: zodResolver(onboardEmployeeInputSchema) as any,
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      gender: "MALE",
      password: "", 
      designation: "",
      departmentId: undefined, 
      role: "MEMBER",
      joiningDate: new Date(),
      skills: "",
      experienceYears: 0,
      taxId: "",
      bankDetails: {
          accountNumber: "",
          bankName: "",
          ifsc: "",
          accountHolder: ""
      }
    } as DefaultValues<FormValues>,
    mode: "onChange", // Validate on change for better UX
  });

  const { trigger, getValues } = form;

  const nextStep = async () => {
    let fieldsToValidate: FieldPath<FormValues>[] = [];
    
    switch (currentStep) {
        case 1: fieldsToValidate = ['firstName', 'lastName', 'email', 'phone', 'password']; break;
        case 2: fieldsToValidate = ['designation', 'departmentId', 'role', 'joiningDate']; break;
        case 3: fieldsToValidate = ['skills', 'experienceYears', 'taxId']; break;
        case 4: fieldsToValidate = ['bankDetails.accountNumber', 'bankDetails.bankName', 'bankDetails.ifsc', 'bankDetails.accountHolder']; break;
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
        setCurrentStep((p) => Math.min(STEPS.length, p + 1));
    }
  };

  const prevStep = () => setCurrentStep((p) => Math.max(1, p - 1));

  const onSubmit = (data: z.infer<typeof onboardEmployeeInputSchema>) => {
    onboardEmployee.mutate(data);
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Progress Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
             Onboard New Talent
        </h1>
        <p className="text-muted-foreground mb-6">Complete the steps below to add a new employee to the organization.</p>
        
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <motion.div 
                className="absolute left-0 top-0 h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
            />
        </div>
        
        <div className="flex justify-between mt-4">
            {STEPS.map((step) => {
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;
                return (
                    <div key={step.id} className={cn("flex flex-col items-center gap-2 transition-colors", 
                        isActive ? "text-primary" : isCompleted ? "text-primary/70" : "text-muted-foreground"
                    )}>
                        <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                            isActive ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(var(--primary),0.3)] scale-110" : 
                            isCompleted ? "border-primary bg-primary text-primary-foreground" : "border-muted bg-muted/50"
                        )}>
                            <step.icon className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-medium hidden md:block">{step.title}</span>
                    </div>
                )
            })}
        </div>
      </div>

      <Card className="border-border/50 shadow-xl overflow-hidden relative">
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
        <CardContent className="p-6 md:p-8 min-h-[400px]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                >
                  {currentStep === 1 && (
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="md:col-span-2 mb-2">
                          <h2 className="text-xl font-semibold">Personal Required Information</h2>
                          <p className="text-sm text-muted-foreground">Basic details to identify the employee.</p>
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input placeholder="John" {...field} className="bg-background/50" />
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
                              <Input placeholder="Doe" {...field} className="bg-background/50" />
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
                              <Input type="email" placeholder="john.doe@company.com" {...field} className="bg-background/50" />
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
                              <Input placeholder="+1 234 567 8900" {...field} className="bg-background/50" />
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
                            <FormLabel>Gender <span className="text-red-500">*</span></FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger className="bg-background/50">
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
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Initial Password (Optional)</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Set initial password..." {...field} className="bg-background/50" />
                            </FormControl>
                            <FormDescription className="text-xs">If left blank, user will set via invite.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="md:col-span-2 mb-2">
                          <h2 className="text-xl font-semibold">Role & Organization</h2>
                          <p className="text-sm text-muted-foreground">Define their position within the company.</p>
                      </div>

                      <FormField
                        control={form.control}
                        name="designation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Designation <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Senior Developer" {...field} className="bg-background/50" />
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
                            <FormLabel>Department <span className="text-red-500">*</span></FormLabel>
                            <Select 
                                onValueChange={(val) => field.onChange(parseInt(val))} 
                                defaultValue={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger className="bg-background/50">
                                  <SelectValue placeholder="Select Department" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {departments?.map((dept) => (
                                    <SelectItem key={dept.id} value={dept.id.toString()}>
                                        {dept.name}
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
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>System Role <span className="text-red-500">*</span></FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-background/50">
                                  <SelectValue placeholder="Select Role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="MEMBER">Member (Employee)</SelectItem>
                                <SelectItem value="ADMIN">Admin (HR/Manager)</SelectItem>
                                <SelectItem value="CLIENT">Client (External)</SelectItem>
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
                            <FormLabel>Joining Date <span className="text-red-500">*</span></FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal bg-background/50",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
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
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="space-y-6">
                        <div className="mb-2">
                          <h2 className="text-xl font-semibold">Skills & Experience</h2>
                          <p className="text-sm text-muted-foreground">Professional background information.</p>
                      </div>

                      <FormField
                        control={form.control}
                        name="skills"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Skills (Comma Separated)</FormLabel>
                            <FormControl>
                              <Input placeholder="React, Node.js, Leadership..." {...field} className="bg-background/50" />
                            </FormControl>
                            <FormDescription>Enter skills separated by commas.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid md:grid-cols-2 gap-6">
                          <FormField
                            control={form.control}
                            name="experienceYears"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Years of Experience</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.1" placeholder="5.5" {...field} className="bg-background/50" />
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
                                <FormLabel>Tax ID (Optional)</FormLabel>
                                <FormControl>
                                  <Input placeholder="SSN / PAN / Tax ID" {...field} className="bg-background/50" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                      </div>
                    </div>
                  )}

                  {currentStep === 4 && (
                      <div className="grid gap-6 md:grid-cols-2">
                         <div className="md:col-span-2 mb-2">
                          <h2 className="text-xl font-semibold">Banking Details</h2>
                          <p className="text-sm text-muted-foreground">Required for payroll processing.</p>
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="bankDetails.accountHolder"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Holder Name <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                              <Input placeholder="Name as per bank records" {...field} className="bg-background/50" />
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
                              <Input placeholder="e.g. Chase, HDFC" {...field} className="bg-background/50" />
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
                              <Input placeholder="XXXX-XXXX-XXXX" {...field} className="bg-background/50" />
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
                              <Input placeholder="Routing / IFSC" {...field} className="bg-background/50" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {currentStep === 5 && (
                    <div className="space-y-6">
                         <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-bold">Ready to Onboard?</h2>
                            <p className="text-muted-foreground">Please review the details below before submitting.</p>
                        </div>
                        
                        <div className="bg-muted/30 rounded-lg p-6 space-y-4 border text-sm">
                            <div className="grid grid-cols-2 gap-4">
                                <div><span className="text-muted-foreground">Full Name:</span> <span className="font-medium">{getValues("firstName")} {getValues("lastName")}</span></div>
                                <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{getValues("email")}</span></div>
                                <div><span className="text-muted-foreground">Role:</span> <span className="font-medium">{getValues("designation")}</span></div>
                                <div><span className="text-muted-foreground">Department:</span> <span className="font-medium">{departments?.find(d => d.id === getValues("departmentId"))?.name}</span></div>
                                <div><span className="text-muted-foreground">Joining:</span> <span className="font-medium">{format(getValues("joiningDate"), "PPP")}</span></div>
                            </div>
                        </div>

                        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900 p-4 rounded-lg flex gap-3 text-sm text-yellow-800 dark:text-yellow-200">
                            <CheckSquare className="w-5 h-5 shrink-0" />
                            <p>By clicking submit, the employee account will be created, and they will be added to the onboarding workflow automatically.</p>
                        </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

               {/* Navigation Buttons */}
              <div className="flex justify-between pt-6 border-t mt-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1 || onboardEmployee.isPending}
                  className="w-24"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                
                {currentStep < 5 ? (
                    <Button
                    type="button"
                    onClick={nextStep}
                    className="w-24 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                    >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                ) : (
                    <Button
                    type="submit"
                    disabled={onboardEmployee.isPending}
                    className="w-32 bg-linear-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25"
                    >
                    {onboardEmployee.isPending ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            Submit
                            <CheckCircle2 className="w-4 h-4 ml-2" />
                        </>
                    )}
                    </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

function FormDescription({ className, children }: { className?: string; children: React.ReactNode }) {
    return (
     <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>
    );
}
