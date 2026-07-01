"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  FileText,
  Users,
  ShieldCheck,
  Plus,
  TrendingUp,
  Loader2,
  Receipt,
} from "lucide-react";
import {
  useTaxDeclarations,
  useMyTaxDeclaration,
  useSaveDeclaration,
  useVerifyDeclaration,
  useAddProof,
  useDeclarationProofs,
  type TaxDeclaration,
  type SaveDeclarationInput,
} from "@/hooks/api/hr/tax";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getErrorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";

function getCurrentFY(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 4
    ? `${year}-${String(year + 1).slice(2)}`
    : `${year - 1}-${String(year).slice(2)}`;
}

const FINANCIAL_YEARS = Array.from({ length: 5 }, (_, i) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const baseYear = month >= 4 ? year : year - 1;
  const fy = baseYear - i;
  return `${fy}-${String(fy + 1).slice(2)}`;
});

const declarationSchema = z.object({
  financialYear: z.string().min(1, "Financial year is required"),
  regime: z.enum(["NEW", "OLD"]),
  hra: z.string(),
  lta: z.string(),
  section80c: z
    .string()
    .refine((v) => parseFloat(v || "0") <= 150000, "Maximum ₹1,50,000"),
  section80d: z
    .string()
    .refine((v) => parseFloat(v || "0") <= 25000, "Maximum ₹25,000"),
  section80g: z.string(),
  homeLoanInterest: z.string(),
});

type DeclarationFormValues = z.infer<typeof declarationSchema>;

const proofSchema = z.object({
  category: z.string().min(1, "Category is required"),
  amount: z.string().min(1, "Amount is required"),
  description: z.string().optional(),
  proofUrl: z.string().optional(),
});

type ProofFormValues = z.infer<typeof proofSchema>;

function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function computeTotal(d: TaxDeclaration): number {
  return [d.hra, d.lta, d.section80c, d.section80d, d.section80g, d.homeLoanInterest].reduce(
    (sum, v) => sum + (parseFloat(v) || 0),
    0,
  );
}

function StatusBadge({ status }: { status: TaxDeclaration["status"] }) {
  const config: Record<TaxDeclaration["status"], string> = {
    DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
    SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200",
    VERIFIED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  const labels: Record<TaxDeclaration["status"], string> = {
    DRAFT: "Draft",
    SUBMITTED: "Submitted",
    VERIFIED: "Verified",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border",
        config[status],
      )}
    >
      {labels[status]}
    </span>
  );
}

function ProofStatusBadge({ status }: { status: "PENDING" | "APPROVED" | "REJECTED" }) {
  const config: Record<"PENDING" | "APPROVED" | "REJECTED", string> = {
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    REJECTED: "bg-red-50 text-red-700 border-red-200",
  };
  const labels: Record<"PENDING" | "APPROVED" | "REJECTED", string> = {
    PENDING: "Pending",
    APPROVED: "Approved",
    REJECTED: "Rejected",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border",
        config[status],
      )}
    >
      {labels[status]}
    </span>
  );
}

function VerifyRowButton({
  declarationId,
  onVerify,
  isPending,
}: {
  declarationId: number;
  onVerify: (id: number) => void;
  isPending: boolean;
}) {
  function handleClick() {
    onVerify(declarationId);
  }
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <ShieldCheck className="h-3.5 w-3.5" />
      Verify
    </motion.button>
  );
}

function DeclarationFormSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function TeamTableSkeleton() {
  return (
    <Card className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: 6 }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 6 }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function TaxPage() {
  const [activeTab, setActiveTab] = useState("my-declaration");
  const [selectedYear, setSelectedYear] = useState<string>(getCurrentFY);
  const [teamYear, setTeamYear] = useState<string>(getCurrentFY);
  const [proofDialogOpen, setProofDialogOpen] = useState(false);

  const { data: myDeclarations, isLoading: isMineLoading } = useMyTaxDeclaration();
  const { data: teamDeclarations, isLoading: isTeamLoading } = useTaxDeclarations(teamYear);
  const saveMutation = useSaveDeclaration();
  const verifyMutation = useVerifyDeclaration();
  const addProofMutation = useAddProof();

  const currentDeclaration = myDeclarations?.find((d) => d.financialYear === selectedYear) ?? null;
  const { data: proofs } = useDeclarationProofs(currentDeclaration?.id ?? null);

  const form = useForm<DeclarationFormValues>({
    resolver: zodResolver(declarationSchema),
    defaultValues: {
      financialYear: getCurrentFY(),
      regime: "NEW",
      hra: "0",
      lta: "0",
      section80c: "0",
      section80d: "0",
      section80g: "0",
      homeLoanInterest: "0",
    },
  });

  const proofForm = useForm<ProofFormValues>({
    resolver: zodResolver(proofSchema),
    defaultValues: { category: "", amount: "", description: "", proofUrl: "" },
  });

  const { reset } = form;

  useEffect(() => {
    reset({
      financialYear: selectedYear,
      regime: currentDeclaration?.regime ?? "NEW",
      hra: currentDeclaration?.hra ?? "0",
      lta: currentDeclaration?.lta ?? "0",
      section80c: currentDeclaration?.section80c ?? "0",
      section80d: currentDeclaration?.section80d ?? "0",
      section80g: currentDeclaration?.section80g ?? "0",
      homeLoanInterest: currentDeclaration?.homeLoanInterest ?? "0",
    });
  }, [currentDeclaration, selectedYear, reset]);

  const hra = form.watch("hra");
  const lta = form.watch("lta");
  const section80c = form.watch("section80c");
  const section80d = form.watch("section80d");
  const section80g = form.watch("section80g");
  const homeLoanInterest = form.watch("homeLoanInterest");
  const regime = form.watch("regime");

  const totalExemptions = [hra, lta, section80c, section80d, section80g, homeLoanInterest].reduce(
    (sum, v) => sum + (parseFloat(v) || 0),
    0,
  );

  function handleSelectedYearChange(year: string) {
    setSelectedYear(year);
  }

  function handleTeamYearChange(year: string) {
    setTeamYear(year);
  }

  function handleTabChange(tab: string) {
    setActiveTab(tab);
  }

  function handleSelectNewRegime() {
    form.setValue("regime", "NEW");
  }

  function handleSelectOldRegime() {
    form.setValue("regime", "OLD");
  }

  function handleSaveAsDraft(values: DeclarationFormValues) {
    const payload: SaveDeclarationInput = { ...values, status: "DRAFT" };
    saveMutation.mutate(payload, {
      onSuccess: () => toast.success("Declaration saved as draft"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleSubmitForApproval(values: DeclarationFormValues) {
    const payload: SaveDeclarationInput = { ...values, status: "SUBMITTED" };
    saveMutation.mutate(payload, {
      onSuccess: () => toast.success("Declaration submitted for verification"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function onSaveDraftClick() {
    void form.handleSubmit(handleSaveAsDraft)();
  }

  function onSubmitClick() {
    void form.handleSubmit(handleSubmitForApproval)();
  }

  function handleOpenProofDialog() {
    setProofDialogOpen(true);
  }

  function handleProofDialogOpenChange(open: boolean) {
    setProofDialogOpen(open);
    if (!open) proofForm.reset();
  }

  function handleAddProof(values: ProofFormValues) {
    if (!currentDeclaration) return;
    addProofMutation.mutate(
      {
        declarationId: currentDeclaration.id,
        category: values.category,
        amount: values.amount,
        description: values.description,
        proofUrl: values.proofUrl,
      },
      {
        onSuccess: () => {
          toast.success("Proof added successfully");
          setProofDialogOpen(false);
          proofForm.reset();
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function onAddProofClick() {
    void proofForm.handleSubmit(handleAddProof)();
  }

  function handleVerify(id: number) {
    verifyMutation.mutate(id, {
      onSuccess: () => toast.success("Declaration verified"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  return (
    <PageWrapper
      title="Tax & Investment Declarations"
      subtitle="Manage your investment declarations and submit proofs for tax exemptions"
    >
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="h-10 p-1 rounded-xl border border-border/60 bg-muted/30">
            <TabsTrigger value="my-declaration" className="rounded-lg text-sm">
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              My Declaration
            </TabsTrigger>
            <TabsTrigger value="team-declarations" className="rounded-lg text-sm">
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Team Declarations
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="space-y-4"
              >
                {activeTab === "my-declaration" && (
                  <>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <Select value={selectedYear} onValueChange={handleSelectedYearChange}>
                        <SelectTrigger className="w-36 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FINANCIAL_YEARS.map((fy) => (
                            <SelectItem key={fy} value={fy}>
                              FY {fy}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {currentDeclaration && (
                        <StatusBadge status={currentDeclaration.status} />
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={handleSelectNewRegime}
                        className={cn(
                          "flex flex-col items-start p-4 rounded-xl border-2 transition-all duration-200 text-left w-full",
                          regime === "NEW"
                            ? "border-violet-500 bg-violet-50/80 shadow-md"
                            : "border-slate-200 bg-white/90 hover:border-violet-300 hover:shadow-sm hover:scale-[1.02]",
                        )}
                      >
                        <span className="text-sm font-semibold text-slate-900">New Tax Regime</span>
                        <span className="text-xs text-slate-500 mt-0.5">
                          Standard deduction ₹75,000 — no itemised exemptions
                        </span>
                      </motion.button>

                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={handleSelectOldRegime}
                        className={cn(
                          "flex flex-col items-start p-4 rounded-xl border-2 transition-all duration-200 text-left w-full",
                          regime === "OLD"
                            ? "border-violet-500 bg-violet-50/80 shadow-md"
                            : "border-slate-200 bg-white/90 hover:border-violet-300 hover:shadow-sm hover:scale-[1.02]",
                        )}
                      >
                        <span className="text-sm font-semibold text-slate-900">Old Tax Regime</span>
                        <span className="text-xs text-slate-500 mt-0.5">
                          Claim HRA, 80C, 80D and other deductions
                        </span>
                      </motion.button>
                    </div>

                    {isMineLoading ? (
                      <DeclarationFormSkeleton />
                    ) : (
                      <Form {...form}>
                        <div className="space-y-4">
                          <Card className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Receipt className="h-4 w-4 text-violet-600" />
                                Deductions &amp; Exemptions
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <FormField
                                control={form.control}
                                name="hra"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-medium text-slate-700">
                                      HRA Exemption (₹)
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        className="h-9"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="lta"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-medium text-slate-700">
                                      LTA (₹)
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        className="h-9"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="section80c"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-medium text-slate-700">
                                      Section 80C (₹){" "}
                                      <span className="text-slate-400 font-normal">max ₹1,50,000</span>
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="0"
                                        max="150000"
                                        placeholder="0"
                                        className="h-9"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="section80d"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-medium text-slate-700">
                                      Section 80D (₹){" "}
                                      <span className="text-slate-400 font-normal">max ₹25,000</span>
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="0"
                                        max="25000"
                                        placeholder="0"
                                        className="h-9"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="section80g"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-medium text-slate-700">
                                      Section 80G (₹)
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        className="h-9"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="homeLoanInterest"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-medium text-slate-700">
                                      Home Loan Interest (₹)
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        className="h-9"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </CardContent>
                          </Card>

                          <Card className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-2xl border border-violet-200/60 shadow-md">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="h-4 w-4 text-violet-600" />
                                  <span className="text-sm font-semibold text-slate-800">
                                    Total Exemptions
                                  </span>
                                </div>
                                <motion.span
                                  key={totalExemptions}
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.15 }}
                                  className="text-lg font-bold text-violet-700"
                                >
                                  {formatINR(totalExemptions)}
                                </motion.span>
                              </div>
                            </CardContent>
                          </Card>

                          <div className="flex items-center gap-3 flex-wrap">
                            <motion.button
                              whileTap={{ scale: 0.97 }}
                              type="button"
                              onClick={onSaveDraftClick}
                              disabled={saveMutation.isPending}
                              className="inline-flex items-center justify-center gap-1.5 h-9 px-4 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm hover:shadow transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {saveMutation.isPending && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              )}
                              Save as Draft
                            </motion.button>

                            <motion.button
                              whileTap={{ scale: 0.97 }}
                              type="button"
                              onClick={onSubmitClick}
                              disabled={saveMutation.isPending}
                              className="inline-flex items-center justify-center gap-1.5 h-9 px-4 text-sm font-medium rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {saveMutation.isPending && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              )}
                              Submit Declaration
                            </motion.button>
                          </div>
                        </div>
                      </Form>
                    )}

                    {currentDeclaration && (
                      <Card className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold">
                              Investment Proofs
                            </CardTitle>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1.5"
                              onClick={handleOpenProofDialog}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add Proof
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {!proofs || proofs.length === 0 ? (
                            <EmptyState
                              compact
                              title="No proofs uploaded"
                              description="Upload investment proof documents to support your declaration."
                            />
                          ) : (
                            <div className="space-y-2">
                              {proofs.map((proof, idx) => (
                                <motion.div
                                  key={proof.id}
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: idx * 0.05, duration: 0.2 }}
                                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-slate-50/60"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-slate-900 truncate">
                                      {proof.category}
                                    </p>
                                    {proof.description && (
                                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                                        {proof.description}
                                      </p>
                                    )}
                                    <p className="text-xs font-semibold text-violet-700 mt-0.5">
                                      {formatINR(parseFloat(proof.amount))}
                                    </p>
                                  </div>
                                  <ProofStatusBadge status={proof.status} />
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    <Dialog open={proofDialogOpen} onOpenChange={handleProofDialogOpenChange}>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Add Investment Proof</DialogTitle>
                        </DialogHeader>
                        <Form {...proofForm}>
                          <div className="space-y-4 pt-2">
                            <FormField
                              control={proofForm.control}
                              name="category"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Category</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="e.g., LIC Premium, PPF, ELSS"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={proofForm.control}
                              name="amount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Amount (₹)</FormLabel>
                                  <FormControl>
                                    <Input type="number" min="0" placeholder="0" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={proofForm.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    Description{" "}
                                    <span className="text-muted-foreground font-normal">
                                      (optional)
                                    </span>
                                  </FormLabel>
                                  <FormControl>
                                    <Input placeholder="Brief description" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={proofForm.control}
                              name="proofUrl"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>
                                    Proof URL{" "}
                                    <span className="text-muted-foreground font-normal">
                                      (optional)
                                    </span>
                                  </FormLabel>
                                  <FormControl>
                                    <Input placeholder="https://..." {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <motion.button
                              whileTap={{ scale: 0.97 }}
                              type="button"
                              onClick={onAddProofClick}
                              disabled={addProofMutation.isPending}
                              className="w-full inline-flex items-center justify-center gap-2 h-9 px-4 text-sm font-medium rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {addProofMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                              {addProofMutation.isPending ? "Adding..." : "Add Proof"}
                            </motion.button>
                          </div>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </>
                )}

                {activeTab === "team-declarations" && (
                  <>
                    <div className="flex items-center gap-3">
                      <Select value={teamYear} onValueChange={handleTeamYearChange}>
                        <SelectTrigger className="w-36 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FINANCIAL_YEARS.map((fy) => (
                            <SelectItem key={fy} value={fy}>
                              FY {fy}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {isTeamLoading ? (
                      <TeamTableSkeleton />
                    ) : !teamDeclarations || teamDeclarations.length === 0 ? (
                      <EmptyState
                        title="No declarations found"
                        description={`No tax declarations submitted for FY ${teamYear}.`}
                      />
                    ) : (
                      <Card className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60">
                        <CardContent className="p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Employee</TableHead>
                                <TableHead className="text-xs">Financial Year</TableHead>
                                <TableHead className="text-xs">Regime</TableHead>
                                <TableHead className="text-xs">Total Exemptions</TableHead>
                                <TableHead className="text-xs">Status</TableHead>
                                <TableHead className="text-xs">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {teamDeclarations.map((d, idx) => (
                                <motion.tr
                                  key={d.id}
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: idx * 0.04, duration: 0.18 }}
                                  className="border-b border-border/40 last:border-0"
                                >
                                  <TableCell className="font-mono text-xs text-slate-600 max-w-[140px] truncate">
                                    {d.userId}
                                  </TableCell>
                                  <TableCell className="text-sm">FY {d.financialYear}</TableCell>
                                  <TableCell>
                                    <span
                                      className={cn(
                                        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border",
                                        d.regime === "NEW"
                                          ? "bg-blue-50 text-blue-700 border-blue-200"
                                          : "bg-purple-50 text-purple-700 border-purple-200",
                                      )}
                                    >
                                      {d.regime}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-sm font-semibold text-slate-800">
                                    {formatINR(computeTotal(d))}
                                  </TableCell>
                                  <TableCell>
                                    <StatusBadge status={d.status} />
                                  </TableCell>
                                  <TableCell>
                                    {(d.status === "DRAFT" || d.status === "SUBMITTED") && (
                                      <VerifyRowButton
                                        declarationId={d.id}
                                        onVerify={handleVerify}
                                        isPending={verifyMutation.isPending}
                                      />
                                    )}
                                  </TableCell>
                                </motion.tr>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </Tabs>
      </div>
    </PageWrapper>
  );
}
