"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Landmark, FileText, ClipboardCheck, Check } from "lucide-react";
import { PersonalInfoTab } from "./_components/personal-info-tab";
import { BankDetailsTab } from "./_components/bank-details-tab";
import { DocumentsTab } from "./_components/documents-tab";
import { ReviewTab } from "./_components/review-tab";

const steps = [
  { id: "personal", label: "Personal Info", icon: User },
  { id: "bank", label: "Bank Details", icon: Landmark },
  { id: "docs", label: "Documents", icon: FileText },
  { id: "finish", label: "Review & Sign", icon: ClipboardCheck },
];

export default function OnboardingPage() {
  const [activeTab, setActiveTab] = useState("personal");
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const markStepComplete = (step: string) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
  };

  const currentStepIndex = steps.findIndex((s) => s.id === activeTab);
  const progressPercentage = Math.round((completedSteps.size / (steps.length - 1)) * 100);

  return (
    <div className="max-w-4xl mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Employee Onboarding</h1>
        <p className="text-muted-foreground mt-2">Complete your profile to get started with Vaivamm Capital.</p>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-medium text-foreground">
            Step {currentStepIndex + 1} of {steps.length}
          </span>
          <span className="text-muted-foreground">{progressPercentage}% Completed</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full gold-gradient rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isCompleted = completedSteps.has(step.id);
            const isCurrent = step.id === activeTab;
            const isPast = index < currentStepIndex;

            return (
              <div key={step.id} className="flex items-center flex-1 last:flex-initial">
                <button onClick={() => setActiveTab(step.id)} className="flex flex-col items-center gap-1.5 group">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCompleted
                      ? "bg-green-500 border-green-500 text-white"
                      : isCurrent
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-muted border-border text-muted-foreground group-hover:border-primary/50"
                  }`}>
                    {isCompleted ? <Check className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
                  </div>
                  <span className={`text-xs font-medium ${
                    isCurrent ? "text-primary" : isCompleted ? "text-green-600" : "text-muted-foreground"
                  }`}>
                    {step.label}
                  </span>
                </button>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-3 mt-[-1.25rem] ${isPast || isCompleted ? "bg-green-500" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-14">
          {steps.map((step, i) => (
            <TabsTrigger
              key={step.id}
              value={step.id}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-10"
            >
              {i + 1}. {step.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="personal">
          <PersonalInfoTab onComplete={() => { markStepComplete("personal"); setActiveTab("bank"); }} />
        </TabsContent>

        <TabsContent value="bank">
          <BankDetailsTab
            onComplete={() => { markStepComplete("bank"); setActiveTab("docs"); }}
            onBack={() => setActiveTab("personal")}
          />
        </TabsContent>

        <TabsContent value="docs">
          <DocumentsTab
            onComplete={() => { markStepComplete("docs"); setActiveTab("finish"); }}
            onBack={() => setActiveTab("bank")}
          />
        </TabsContent>

        <TabsContent value="finish">
          <ReviewTab
            completedSteps={completedSteps}
            steps={steps}
            onBack={() => setActiveTab("personal")}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
