"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateBankDetails, updatePersonalDetails, uploadOnboardingDocument } from "@/server/actions/onboarding-actions";
import { toast } from "sonner";
import { Loader2, CheckCircle, Upload, ArrowLeft, ArrowRight, User, Landmark, FileText, ClipboardCheck, Check } from "lucide-react";

// --- Zod Schemas ---
const personalSchema = z.object({
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  skills: z.string().min(3, "Add at least one skill"),
  experienceYears: z.string().min(1, "Experience is required"),
});

const bankSchema = z.object({
  accountHolder: z.string().min(2, "Account Holder Name is required"),
  bankName: z.string().min(2, "Bank Name is required"),
  accountNumber: z.string().min(5, "Account Number is required"),
  ifsc: z.string().min(4, "IFSC Code is required"),
  taxId: z.string().optional(),
});

const steps = [
  { id: "personal", label: "Personal Info", icon: User },
  { id: "bank", label: "Bank Details", icon: Landmark },
  { id: "docs", label: "Documents", icon: FileText },
  { id: "finish", label: "Review & Sign", icon: ClipboardCheck },
];

export default function OnboardingPage() {
  const [activeTab, setActiveTab] = useState("personal");
  const [isLoading, setIsLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});

  const markStepComplete = (step: string) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
  };

  const currentStepIndex = steps.findIndex((s) => s.id === activeTab);

  // Forms
  const personalForm = useForm<z.infer<typeof personalSchema>>({
    resolver: zodResolver(personalSchema),
  });

  const bankForm = useForm<z.infer<typeof bankSchema>>({
    resolver: zodResolver(bankSchema),
  });

  // Handlers
  const onPersonalSubmit = async (values: z.infer<typeof personalSchema>) => {
    setIsLoading(true);
    const formData = new FormData();
    Object.entries(values).forEach(([k, v]) => formData.append(k, v));

    const res = await updatePersonalDetails(formData);
    setIsLoading(false);

    if (res.success) {
      toast.success("Personal details saved!");
      markStepComplete("personal");
      setActiveTab("bank");
    } else {
      toast.error(res.error || "Something went wrong");
    }
  };

  const onBankSubmit = async (values: z.infer<typeof bankSchema>) => {
    setIsLoading(true);
    const formData = new FormData();
    Object.entries(values).forEach(([k, v]) => formData.append(k, v));

    const res = await updateBankDetails(formData);
    setIsLoading(false);

    if (res.success) {
      toast.success("Bank details saved!");
      markStepComplete("bank");
      setActiveTab("docs");
    } else {
      toast.error(res.error || "Failed to save bank details");
    }
  };

  const onFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    const res = await uploadOnboardingDocument(formData);
    setIsLoading(false);

    if (res.success) {
      toast.success(`${type} uploaded successfully!`);
      setUploadedFiles((prev) => ({ ...prev, [type]: file.name }));
    } else {
      toast.error(res.error || "Upload failed");
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Employee Onboarding</h1>
        <p className="text-muted-foreground mt-2">
          Complete your profile to get started with Vaivamm Capital.
        </p>
      </div>

      {/* Step Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isCompleted = completedSteps.has(step.id);
            const isCurrent = step.id === activeTab;
            const isPast = index < currentStepIndex;

            return (
              <div key={step.id} className="flex items-center flex-1 last:flex-initial">
                <button
                  onClick={() => setActiveTab(step.id)}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCompleted
                        ? "bg-green-500 border-green-500 text-white"
                        : isCurrent
                        ? "bg-primary border-primary text-primary-foreground"
                        : "bg-muted border-border text-muted-foreground group-hover:border-primary/50"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      isCurrent ? "text-primary" : isCompleted ? "text-green-600" : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-3 mt-[-1.25rem] ${
                      isPast || isCompleted ? "bg-green-500" : "bg-border"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-14">
          <TabsTrigger value="personal" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-10">1. Personal Info</TabsTrigger>
          <TabsTrigger value="bank" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-10">2. Bank Details</TabsTrigger>
          <TabsTrigger value="docs" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-10">3. Documents</TabsTrigger>
          <TabsTrigger value="finish" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-10">4. Review & Sign</TabsTrigger>
        </TabsList>

        {/* --- Step 1: Personal Info --- */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Tell us a bit about your professional background.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={personalForm.handleSubmit(onPersonalSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input {...personalForm.register("phone")} placeholder="+91 98765 43210" />
                    {personalForm.formState.errors.phone && <p className="text-sm text-red-500">{personalForm.formState.errors.phone.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Years of Experience</Label>
                    <Input {...personalForm.register("experienceYears")} type="number" step="0.1" placeholder="e.g. 2.5" />
                    {personalForm.formState.errors.experienceYears && <p className="text-sm text-red-500">{personalForm.formState.errors.experienceYears.message}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Skills (Comma separated)</Label>
                  <Input {...personalForm.register("skills")} placeholder="React, Node.js, TypeScript..." />
                  {personalForm.formState.errors.skills && <p className="text-sm text-red-500">{personalForm.formState.errors.skills.message}</p>}
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save & Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Step 2: Bank Details --- */}
        <TabsContent value="bank">
          <Card>
            <CardHeader>
              <CardTitle>Bank & Tax Details</CardTitle>
              <CardDescription>Required for payroll processing.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={bankForm.handleSubmit(onBankSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Account Holder Name</Label>
                    <Input {...bankForm.register("accountHolder")} placeholder="Your Name" />
                    {bankForm.formState.errors.accountHolder && <p className="text-sm text-red-500">{bankForm.formState.errors.accountHolder.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Bank Name</Label>
                    <Input {...bankForm.register("bankName")} placeholder="HDFC, SBI, etc." />
                    {bankForm.formState.errors.bankName && <p className="text-sm text-red-500">{bankForm.formState.errors.bankName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input {...bankForm.register("accountNumber")} placeholder="0000 0000 0000" />
                    {bankForm.formState.errors.accountNumber && <p className="text-sm text-red-500">{bankForm.formState.errors.accountNumber.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>IFSC Code</Label>
                    <Input {...bankForm.register("ifsc")} placeholder="HDFC000123" />
                    {bankForm.formState.errors.ifsc && <p className="text-sm text-red-500">{bankForm.formState.errors.ifsc.message}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tax ID (PAN/SSN) <span className="text-muted-foreground font-normal ml-1">(Optional)</span></Label>
                  <Input {...bankForm.register("taxId")} placeholder="ABCDE1234F" />
                  {bankForm.formState.errors.taxId && <p className="text-sm text-red-500">{bankForm.formState.errors.taxId.message}</p>}
                </div>
                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setActiveTab("personal")}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save & Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- Step 3: Documents --- */}
        <TabsContent value="docs">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Please upload the necessary documents.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* ID Proof */}
                <div className={`border border-dashed rounded-lg p-6 flex flex-col items-center text-center space-y-2 transition ${
                  uploadedFiles["ID"]
                    ? "border-green-400 bg-green-50"
                    : "border-gray-300 hover:bg-gray-50"
                }`}>
                  {uploadedFiles["ID"] ? (
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  )}
                  <Label htmlFor="id-upload" className="font-semibold cursor-pointer">Upload ID Proof</Label>
                  <span className="text-xs text-muted-foreground">Passport / Aadhar / License</span>
                  {uploadedFiles["ID"] && (
                    <span className="text-xs text-green-600 font-medium">{uploadedFiles["ID"]}</span>
                  )}
                  <Input id="id-upload" type="file" className="hidden" onChange={(e) => onFileUpload(e, "ID")} />
                  <Button variant="outline" size="sm" onClick={() => document.getElementById("id-upload")?.click()} disabled={isLoading}>
                    {uploadedFiles["ID"] ? "Replace File" : "Select File"}
                  </Button>
                </div>

                {/* Certificates */}
                <div className={`border border-dashed rounded-lg p-6 flex flex-col items-center text-center space-y-2 transition ${
                  uploadedFiles["CERTIFICATE"]
                    ? "border-green-400 bg-green-50"
                    : "border-gray-300 hover:bg-gray-50"
                }`}>
                  {uploadedFiles["CERTIFICATE"] ? (
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  )}
                  <Label htmlFor="cert-upload" className="font-semibold cursor-pointer">Educational Certificates</Label>
                  <span className="text-xs text-muted-foreground">Highest Degree / Diploma</span>
                  {uploadedFiles["CERTIFICATE"] && (
                    <span className="text-xs text-green-600 font-medium">{uploadedFiles["CERTIFICATE"]}</span>
                  )}
                  <Input id="cert-upload" type="file" className="hidden" onChange={(e) => onFileUpload(e, "CERTIFICATE")} />
                  <Button variant="outline" size="sm" onClick={() => document.getElementById("cert-upload")?.click()} disabled={isLoading}>
                    {uploadedFiles["CERTIFICATE"] ? "Replace File" : "Select File"}
                  </Button>
                </div>

                 {/* Contract */}
                 <div className={`border border-dashed rounded-lg p-6 flex flex-col items-center text-center space-y-2 transition ${
                  uploadedFiles["CONTRACT"]
                    ? "border-green-400 bg-green-50"
                    : "border-gray-300 hover:bg-gray-50"
                }`}>
                  {uploadedFiles["CONTRACT"] ? (
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  ) : (
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  )}
                  <Label htmlFor="contract-upload" className="font-semibold cursor-pointer">Signed Contract</Label>
                  <span className="text-xs text-muted-foreground">If provided offline</span>
                  {uploadedFiles["CONTRACT"] && (
                    <span className="text-xs text-green-600 font-medium">{uploadedFiles["CONTRACT"]}</span>
                  )}
                  <Input id="contract-upload" type="file" className="hidden" onChange={(e) => onFileUpload(e, "CONTRACT")} />
                  <Button variant="outline" size="sm" onClick={() => document.getElementById("contract-upload")?.click()} disabled={isLoading}>
                    {uploadedFiles["CONTRACT"] ? "Replace File" : "Select File"}
                  </Button>
                </div>

              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab("bank")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => { markStepComplete("docs"); setActiveTab("finish"); }}>
                Continue to Review
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* --- Step 4: Finish --- */}
        <TabsContent value="finish">
          <Card className="text-center py-10">
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="bg-green-100 p-4 rounded-full">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold">You&apos;re All Set!</h2>
              <p className="text-muted-foreground max-w-md">
                Your onboarding information has been submitted. The HR team will verify your documents and approve your profile soon.
              </p>

              {/* Summary of completed steps */}
              <div className="w-full max-w-sm space-y-2 pt-4">
                {steps.slice(0, 3).map((step) => {
                  const isCompleted = completedSteps.has(step.id);
                  const StepIcon = step.icon;
                  return (
                    <div
                      key={step.id}
                      className={`flex items-center gap-3 p-3 rounded-lg text-left ${
                        isCompleted ? "bg-green-50" : "bg-muted/50"
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <StepIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className={`text-sm font-medium ${isCompleted ? "text-green-700" : "text-muted-foreground"}`}>
                        {step.label}
                      </span>
                      <span className={`ml-auto text-xs ${isCompleted ? "text-green-600" : "text-muted-foreground"}`}>
                        {isCompleted ? "Completed" : "Pending"}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setActiveTab("personal")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Review Steps
                </Button>
                <Button onClick={() => window.location.href = "/dashboard"}>
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
