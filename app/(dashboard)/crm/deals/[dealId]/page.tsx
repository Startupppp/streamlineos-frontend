"use client";

import { use, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft, Calendar, User, Edit2, Trophy, XCircle,
  ChevronRight, Clock, Building2, Phone, Mail, StickyNote,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import Link from "next/link";

const STAGES = [
  { key: "LEAD", label: "Lead", color: "#3B82F6", bg: "bg-blue-500/10" },
  { key: "CONTACTED", label: "Contacted", color: "#0EA5E9", bg: "bg-sky-500/10" },
  { key: "PROPOSAL", label: "Proposal", color: "#F59E0B", bg: "bg-amber-500/10" },
  { key: "NEGOTIATION", label: "Negotiation", color: "#8B5CF6", bg: "bg-purple-500/10" },
  { key: "WON", label: "Won", color: "#10B981", bg: "bg-emerald-500/10" },
  { key: "LOST", label: "Lost", color: "#EF4444", bg: "bg-red-500/10" },
] as const;

type DealStage = typeof STAGES[number]["key"];

function formatINR(v: number) {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v.toLocaleString("en-IN")}`;
}

const editSchema = z.object({
  name: z.string().min(1, "Name is required"),
  value: z.string().optional(),
  stage: z.enum(["LEAD", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"]),
  probability: z.coerce.number().min(0).max(100),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  expectedCloseDate: z.string().optional(),
  notes: z.string().optional(),
  lostReason: z.string().optional(),
});
type EditForm = z.infer<typeof editSchema>;

export default function DealDetailPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { dealId: dealIdStr } = use(params);
  const dealId = Number(dealIdStr);
  const router = useRouter();
  const utils = api.useUtils();

  const { data: deal, isLoading } = api.deals.getById.useQuery({ id: dealId });
  const [isEditing, setIsEditing] = useState(false);

  const updateDeal = api.deals.update.useMutation({
    onSuccess: () => {
      utils.deals.getById.invalidate({ id: dealId });
      toast.success("Deal updated");
      setIsEditing(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateStage = api.deals.updateStage.useMutation({
    onSuccess: () => {
      utils.deals.getById.invalidate({ id: dealId });
      toast.success("Stage updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema) as unknown as Resolver<EditForm>,
    values: deal ? {
      name: deal.name,
      value: deal.value ?? "0",
      stage: deal.stage as DealStage,
      probability: deal.probability ?? 0,
      contactPerson: deal.contactPerson ?? "",
      contactEmail: deal.contactEmail ?? "",
      contactPhone: deal.contactPhone ?? "",
      expectedCloseDate: deal.expectedCloseDate ?? "",
      notes: deal.notes ?? "",
      lostReason: deal.lostReason ?? "",
    } : undefined,
  });

  const handleStageChange = useCallback((stage: DealStage) => {
    updateStage.mutate({ id: dealId, stage });
  }, [dealId, updateStage]);

  const onEditSubmit = useCallback((data: EditForm) => {
    updateDeal.mutate({
      id: dealId,
      name: data.name,
      value: data.value || "0",
      stage: data.stage,
      probability: data.probability,
      contactPerson: data.contactPerson || undefined,
      contactEmail: data.contactEmail || undefined,
      contactPhone: data.contactPhone || undefined,
      expectedCloseDate: data.expectedCloseDate || undefined,
      notes: data.notes || undefined,
      lostReason: data.lostReason || undefined,
    });
  }, [dealId, updateDeal]);

  const currentStageIndex = useMemo(() => {
    if (!deal) return -1;
    return STAGES.findIndex(s => s.key === deal.stage);
  }, [deal]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-5">
          <Skeleton className="h-[500px] lg:col-span-3" />
          <Skeleton className="h-[500px] lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <p className="text-muted-foreground">Deal not found</p>
        <Button variant="outline" onClick={() => router.push("/crm/deals")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Deals
        </Button>
      </div>
    );
  }

  const stageConfig = STAGES.find(s => s.key === deal.stage) ?? STAGES[0];
  const dealValue = Number(deal.value ?? 0);

  return (
    <motion.div
      className="space-y-6 p-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp} className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => router.push("/crm/deals")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{deal.name}</h1>
          <p className="text-lg font-bold text-[#bd882c] mt-0.5">{formatINR(dealValue)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            className="text-sm px-3 py-1"
            style={{ backgroundColor: `${stageConfig.color}20`, color: stageConfig.color }}
          >
            {stageConfig.label}
          </Badge>
          {deal.probability !== null && (
            <Badge variant="secondary" className="text-xs">{deal.probability}% probability</Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
            <Edit2 className="h-4 w-4 mr-1" />
            {isEditing ? "Cancel" : "Edit"}
          </Button>
          {deal.stage !== "WON" && deal.stage !== "LOST" && (
            <>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => handleStageChange("WON")}
              >
                <Trophy className="h-4 w-4 mr-1" />
                Mark Won
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleStageChange("LOST")}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Mark Lost
              </Button>
            </>
          )}
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="flex items-center gap-1 p-2 rounded-xl bg-muted/30 border border-border/50 overflow-x-auto">
        {STAGES.map((stage, i) => {
          const isActive = stage.key === deal.stage;
          const isPast = i < currentStageIndex;
          return (
            <button
              key={stage.key}
              onClick={() => handleStageChange(stage.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                isActive ? cn(stage.bg, "ring-1 ring-current/20") :
                isPast ? "bg-muted/50 text-muted-foreground" :
                "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/30"
              )}
              style={isActive ? { color: stage.color } : undefined}
            >
              {stage.label}
              {i < STAGES.length - 1 && <ChevronRight className="h-3 w-3 ml-1 text-muted-foreground/30" />}
            </button>
          );
        })}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-5">
        <motion.div variants={fadeUp} className="lg:col-span-3 space-y-6">
          {isEditing ? (
            <Card className="shadow-noir">
              <CardHeader>
                <CardTitle className="text-base">Edit Deal</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...editForm}>
                  <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <FormField control={editForm.control} name="name" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Deal Name</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <FormField control={editForm.control} name="value" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Value (INR)</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="stage" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stage</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {STAGES.map(s => (
                                <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="probability" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Probability (%)</FormLabel>
                          <FormControl><Input type="number" min={0} max={100} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="expectedCloseDate" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expected Close</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="contactPerson" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Person</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="contactEmail" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Email</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={editForm.control} name="contactPhone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Phone</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      {deal.stage === "LOST" && (
                        <FormField control={editForm.control} name="lostReason" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Lost Reason</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      )}
                      <div className="col-span-2">
                        <FormField control={editForm.control} name="notes" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes</FormLabel>
                            <FormControl><Textarea {...field} rows={3} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                      <Button type="submit" className="bg-[#bd882c] hover:bg-[#a67724] text-white" disabled={updateDeal.isPending}>
                        {updateDeal.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-noir">
              <CardHeader>
                <CardTitle className="text-base">Deal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { icon: User, label: "Contact Person", value: deal.contactPerson },
                    { icon: Mail, label: "Contact Email", value: deal.contactEmail, href: deal.contactEmail ? `mailto:${deal.contactEmail}` : undefined },
                    { icon: Phone, label: "Contact Phone", value: deal.contactPhone, href: deal.contactPhone ? `tel:${deal.contactPhone}` : undefined },
                    { icon: Calendar, label: "Expected Close", value: deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString("en-IN") : null },
                    { icon: Calendar, label: "Actual Close", value: deal.actualCloseDate ? new Date(deal.actualCloseDate).toLocaleDateString("en-IN") : null },
                    { icon: Clock, label: "Probability", value: `${deal.probability ?? 0}%` },
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-2">
                      <item.icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        {item.href ? (
                          <a href={item.href} className="text-sm text-[#bd882c] hover:underline">{item.value || "\u2014"}</a>
                        ) : (
                          <p className="text-sm">{item.value || "\u2014"}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/5 to-[#bd882c]/5 border border-border/50">
                  <p className="text-xs text-muted-foreground">Deal Value</p>
                  <p className="text-3xl font-bold text-[#bd882c]">{formatINR(dealValue)}</p>
                  {deal.probability !== null && deal.probability > 0 && (
                    <div className="mt-2">
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-[#bd882c]" style={{ width: `${deal.probability}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Weighted: {formatINR(Math.round(dealValue * (deal.probability / 100)))}</p>
                    </div>
                  )}
                </div>

                {deal.notes && (
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{deal.notes}</p>
                  </div>
                )}

                {deal.lostReason && (
                  <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                    <p className="text-xs text-red-400 mb-1">Lost Reason</p>
                    <p className="text-sm">{deal.lostReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>

        <motion.div variants={fadeUp} className="lg:col-span-2 space-y-6">
          {deal.assignedTo && (
            <Card className="shadow-noir">
              <CardHeader>
                <CardTitle className="text-base">Assigned To</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#bd882c]/10 flex items-center justify-center text-sm font-semibold text-[#bd882c]">
                    {deal.assignedTo.name?.[0] ?? "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{deal.assignedTo.name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {deal.lead && (
            <Card className="shadow-noir">
              <CardHeader>
                <CardTitle className="text-base">Linked Lead</CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={`/crm/leads/${deal.lead.id}`} className="flex items-center gap-3 group">
                  <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-sm font-semibold text-blue-400">
                    {deal.lead.name?.[0] ?? "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium group-hover:text-[#bd882c] transition-colors">{deal.lead.name}</p>
                    {deal.lead.email && <p className="text-xs text-muted-foreground">{deal.lead.email}</p>}
                    {deal.lead.phone && <p className="text-xs text-muted-foreground">{deal.lead.phone}</p>}
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}

          {deal.client && (
            <Card className="shadow-noir">
              <CardHeader>
                <CardTitle className="text-base">Linked Client</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-sm font-semibold text-emerald-400">
                    {deal.client.name?.[0] ?? "?"}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{deal.client.name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-noir">
            <CardHeader>
              <CardTitle className="text-base">Key Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Created", value: deal.createdAt },
                { label: "Updated", value: deal.updatedAt },
                { label: "Expected Close", value: deal.expectedCloseDate },
                { label: "Actual Close", value: deal.actualCloseDate },
              ]
                .filter(d => d.value)
                .map(d => (
                  <div key={d.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{d.label}</span>
                    <span>{new Date(d.value!).toLocaleDateString("en-IN")}</span>
                  </div>
                ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
