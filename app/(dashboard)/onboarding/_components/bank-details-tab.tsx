"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { updateBankDetails } from "@/server/actions/onboarding-actions";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";

const bankSchema = z.object({
  accountHolder: z.string().min(2, "Account Holder Name is required"),
  bankName: z.string().min(2, "Bank Name is required"),
  accountNumber: z.string().min(5, "Account Number is required"),
  ifsc: z.string().min(4, "IFSC Code is required"),
  taxId: z.string().optional(),
});

interface BankDetailsTabProps {
  onComplete: () => void;
  onBack: () => void;
}

export function BankDetailsTab({ onComplete, onBack }: BankDetailsTabProps) {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<z.infer<typeof bankSchema>>({
    resolver: zodResolver(bankSchema),
  });

  const onSubmit = async (values: z.infer<typeof bankSchema>) => {
    setIsLoading(true);
    const formData = new FormData();
    Object.entries(values).forEach(([k, v]) => formData.append(k, v));
    const res = await updateBankDetails(formData);
    setIsLoading(false);
    if (res.success) {
      toast.success("Bank details saved!");
      onComplete();
    } else {
      toast.error(res.error || "Failed to save bank details");
    }
  };

  return (
    <Card className="shadow-noir border-border">
      <CardContent className="pt-6">
        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
          <motion.div variants={fadeUp} className="mb-6">
            <h2 className="text-xl font-bold text-foreground">Bank & Tax Details</h2>
            <p className="text-sm text-muted-foreground mt-1">Required for payroll processing.</p>
          </motion.div>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account Holder Name</Label>
                <Input {...form.register("accountHolder")} placeholder="Your Name" className="focus-visible:ring-primary" />
                {form.formState.errors.accountHolder && <p className="text-sm text-destructive">{form.formState.errors.accountHolder.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input {...form.register("bankName")} placeholder="HDFC, SBI, etc." className="focus-visible:ring-primary" />
                {form.formState.errors.bankName && <p className="text-sm text-destructive">{form.formState.errors.bankName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input {...form.register("accountNumber")} placeholder="0000 0000 0000" className="focus-visible:ring-primary" />
                {form.formState.errors.accountNumber && <p className="text-sm text-destructive">{form.formState.errors.accountNumber.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>IFSC Code</Label>
                <Input {...form.register("ifsc")} placeholder="HDFC000123" className="focus-visible:ring-primary" />
                {form.formState.errors.ifsc && <p className="text-sm text-destructive">{form.formState.errors.ifsc.message}</p>}
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="space-y-2">
              <Label>Tax ID (PAN/SSN) <span className="text-muted-foreground font-normal ml-1">(Optional)</span></Label>
              <Input {...form.register("taxId")} placeholder="ABCDE1234F" className="focus-visible:ring-primary" />
            </motion.div>
            <motion.div variants={fadeUp} className="flex justify-between">
              <Button type="button" variant="outline" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save & Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          </form>
        </motion.div>
      </CardContent>
    </Card>
  );
}
