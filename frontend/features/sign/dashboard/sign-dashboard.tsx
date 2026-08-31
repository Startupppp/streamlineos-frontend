"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Inbox, Send, CheckCircle2, Clock, AlertTriangle, FileStack, UploadCloud } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ErrorState } from "@/components/shared/error-state";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { useMotionVariants } from "@/lib/motion-variants";
import { useSignDashboard } from "@/hooks/api/sign/reports";
import { CreateEnvelopeDialog } from "../components/create-envelope-dialog";

function formatEventType(eventType: string): string {
  return eventType.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

export function SignDashboard() {
  const { staggerContainer, fadeUp } = useMotionVariants();
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useSignDashboard();

  if (isLoading || !data) {
    return (
      <PageWrapper title="SignOS" subtitle="Envelopes, signatures, and completion status at a glance">
        <StatCardGridSkeleton cols={4} />
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="SignOS" subtitle="Envelopes, signatures, and completion status at a glance">
        <ErrorState title="Failed to load SignOS dashboard" onRetry={() => void refetch()} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="SignOS"
      subtitle="Envelopes, signatures, and completion status at a glance"
      actions={
        <AnimatedIconButton icon={PlusIcon} iconClassName="mr-1.5" onClick={() => setCreateOpen(true)}>
          New envelope
        </AnimatedIconButton>
      }
    >
      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-6">
        <motion.div variants={fadeUp}>
          <StatCardGrid cols={5}>
            <StatCard label="Awaiting me" value={data.awaitingMe} icon={Inbox} tone="blue" />
            <StatCard label="Sent, pending signature" value={data.sentPending} icon={Send} tone="amber" />
            <StatCard label="Completed this month" value={data.completedThisMonth} icon={CheckCircle2} tone="emerald" />
            <StatCard label="Expiring soon" value={data.expiringSoon} icon={Clock} tone="amber" />
            <StatCard label="Failed / bounced" value={data.failedOrBounced} icon={AlertTriangle} tone="red" />
          </StatCardGrid>
        </motion.div>

        <motion.div variants={fadeUp} className="grid gap-4 md:grid-cols-3">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setCreateOpen(true)}>
            <CardContent className="pt-6 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2.5">
                <UploadCloud className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Upload &amp; send</p>
                <p className="text-xs text-muted-foreground">Start a new envelope from a PDF</p>
              </div>
            </CardContent>
          </Card>
          <Link href="/sign/templates">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="pt-6 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <FileStack className="size-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Browse templates</p>
                  <p className="text-xs text-muted-foreground">Reuse a saved envelope layout</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/sign/bulk-send">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="pt-6 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <Send className="size-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Bulk send</p>
                  <p className="text-xs text-muted-foreground">Send one template to many people</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No activity yet.</p>
              ) : (
                <ul className="space-y-3">
                  {data.recentActivity.map((event) => (
                    <li key={event.id} className="flex items-center justify-between gap-3 text-sm border-b border-border/60 pb-3 last:border-0 last:pb-0">
                      <span className="text-foreground">{formatEventType(event.eventType)}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {event.actorName ?? "System"} · {new Date(event.createdAt).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <CreateEnvelopeDialog open={createOpen} onOpenChange={setCreateOpen} />
    </PageWrapper>
  );
}
