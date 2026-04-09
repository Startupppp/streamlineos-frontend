"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback, useMemo } from "react";
import { useRecognitions, useCreateRecognition, type Recognition } from "@/lib/api/hooks/hr";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { HrSheet } from "@/features/hr/hr-sheet";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { resolveImageUrl } from "@/lib/utils";
import { Heart, Plus, Award, Users, Lightbulb, Zap, Star } from "lucide-react";
import type { Employee } from "@/types/hr";
import Image from "next/image";

const CATEGORIES = [
  { value: "KUDOS", label: "Kudos", icon: Heart, color: "text-pink-500" },
  { value: "TEAMWORK", label: "Teamwork", icon: Users, color: "text-blue-500" },
  { value: "INNOVATION", label: "Innovation", icon: Lightbulb, color: "text-amber-500" },
  { value: "LEADERSHIP", label: "Leadership", icon: Award, color: "text-purple-500" },
  { value: "ABOVE_AND_BEYOND", label: "Above & Beyond", icon: Zap, color: "text-green-500" },
];

function getCategoryMeta(category: string | null) {
  return CATEGORIES.find((c) => c.value === category) ?? CATEGORIES[0];
}

export default function RecognitionPage() {
  const { data: recognitions, isLoading } = useRecognitions();
  const { data: employeesRaw } = useHrEmployees();
  const createRecognition = useCreateRecognition();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [toUserId, setToUserId] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("KUDOS");

  const employees = useMemo(
    () => (Array.isArray(employeesRaw) ? employeesRaw : (employeesRaw as { data?: Employee[] })?.data ?? []) as Employee[],
    [employeesRaw]
  );

  const handleSend = useCallback(() => {
    if (!toUserId || !message.trim()) {
      toast.error("Recipient and message are required");
      return;
    }
    createRecognition.mutate(
      { toUserId, message: message.trim(), category },
      {
        onSuccess: () => {
          toast.success("Recognition sent!");
          setSheetOpen(false);
          setToUserId("");
          setMessage("");
          setCategory("KUDOS");
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [toUserId, message, category, createRecognition]);

  if (isLoading) {
    return (
      <PageWrapper title="Recognition" subtitle="Celebrate your team">
        <div className="space-y-3 max-w-2xl mx-auto">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Recognition"
      subtitle="Celebrate achievements and recognize great work"
      badge={`${recognitions?.length ?? 0} kudos`}
      actions={
        <Button size="sm" onClick={() => setSheetOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" />Give Kudos
        </Button>
      }
    >
      <div className="max-w-2xl mx-auto">
        {!recognitions?.length ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Heart className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
              <Image
              src="/illustrations/undraw-online-survey.svg"
              alt="Empty state illustration"
              width={200}
              height={160}
              className="mx-auto mb-4 opacity-90"
            />
            <p className="text-sm text-muted-foreground">No recognition yet. Be the first to celebrate a teammate!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recognitions.map((r: Recognition) => {
              const catMeta = getCategoryMeta(r.category);
              const Icon = catMeta.icon;
              return (
                <Card key={r.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={resolveImageUrl(r.fromUser?.image ?? null)} />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">{r.fromUser?.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">{r.fromUser?.name}</span>
                          <span className="text-xs text-muted-foreground">recognized</span>
                          <span className="text-sm font-semibold">{r.toUser?.name}</span>
                          <Badge variant="outline" className={`text-[10px] gap-1 ${catMeta.color}`}>
                            <Icon className="h-3 w-3" />
                            {catMeta.label}
                          </Badge>
                        </div>
                        <p className="text-sm mt-1.5 text-foreground/90">{r.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          {r.createdAt ? formatDistanceToNow(new Date(r.createdAt), { addSuffix: true }) : ""}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <HrSheet open={sheetOpen} onOpenChange={setSheetOpen} title="Give Recognition" onSubmit={handleSend} submitLabel="Send Kudos" isPending={createRecognition.isPending}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Who deserves recognition?</label>
          <Select value={toUserId} onValueChange={setToUserId}>
            <SelectTrigger><SelectValue placeholder="Select teammate" /></SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name ?? e.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Category</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Message</label>
          <Textarea
            placeholder="What did they do that was awesome?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={500}
          />
          <p className="text-[10px] text-muted-foreground text-right">{message.length}/500</p>
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
