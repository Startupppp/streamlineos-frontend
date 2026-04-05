"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { AttendanceContent } from "./attendance-content";
import { MyWfhRequests, PendingWfhApprovals } from "@/components/hr/wfh-requests-list";
import { RequestWfhDialog } from "@/components/hr/request-wfh-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";

type Tab = "attendance" | "wfh";

export default function AttendancePage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("attendance");

  if (status === "loading") {
    return (
      <div className="space-y-6 px-4 sm:px-6 py-5">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-6">
            <Skeleton className="h-72" />
            <Skeleton className="h-48" />
          </div>
          <div className="lg:col-span-8 space-y-6">
            <Skeleton className="h-80" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  const userId = session?.user?.id;
  if (!userId) return null;

  const isAdmin =
    session?.user?.role === "CEO" || session?.user?.role === "ADMIN";

  return (
    <PageWrapper
      title="Attendance"
      subtitle="Track your work hours, breaks, and work from home requests."
      noInternalScroll
      actions={
        <div className="flex items-center gap-2 rounded-full bg-muted p-1" role="tablist" aria-label="Attendance view">
          <button
            role="tab"
            aria-selected={activeTab === "attendance"}
            onClick={() => setActiveTab("attendance")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeTab === "attendance"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Attendance
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "wfh"}
            onClick={() => setActiveTab("wfh")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeTab === "wfh"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            WFH Requests
          </button>
        </div>
      }
    >
      {activeTab === "attendance" ? (
        <AttendanceContent userId={userId} isAdmin={isAdmin} />
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-6 overflow-y-auto h-full pb-6"
        >
          <motion.div variants={fadeUp} className="flex justify-end">
            <RequestWfhDialog />
          </motion.div>
          <motion.div variants={fadeUp}>
            <MyWfhRequests />
          </motion.div>
          {isAdmin && (
            <motion.div variants={fadeUp}>
              <PendingWfhApprovals />
            </motion.div>
          )}
        </motion.div>
      )}
    </PageWrapper>
  );
}
