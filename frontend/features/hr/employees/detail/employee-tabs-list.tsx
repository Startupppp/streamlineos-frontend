"use client";

import { forwardRef } from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Clock, FileCheck, Shield, UserCircle } from "lucide-react";

interface EmployeeTabsListProps {
  showSensitiveTab: boolean;
  isSelf: boolean;
}

export const EmployeeTabsList = forwardRef<HTMLDivElement, EmployeeTabsListProps>(
  function EmployeeTabsList({ showSensitiveTab, isSelf }, ref) {
    return (
      <TabsList
        ref={ref}
        className="h-auto min-h-9 w-max min-w-full justify-start gap-1 overflow-visible rounded-lg border p-1"
      >
        <TabsTrigger
          value="overview"
          className="h-8 min-h-8 flex-none shrink-0 gap-1.5 rounded-md px-2.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          <Briefcase className="h-3 w-3" />
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="attendance"
          className="h-8 min-h-8 flex-none shrink-0 gap-1.5 rounded-md px-2.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          <Clock className="h-3 w-3" />
          Attendance
        </TabsTrigger>
        <TabsTrigger
          value="timeline"
          className="h-8 min-h-8 flex-none shrink-0 gap-1.5 rounded-md px-2.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          <Clock className="h-3 w-3" />
          Timeline
        </TabsTrigger>
        <TabsTrigger
          value="sensitive"
          hidden={!showSensitiveTab}
          className="h-8 min-h-8 flex-none shrink-0 gap-1.5 rounded-md px-2.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          <Shield className="h-3 w-3" />
          Sensitive
        </TabsTrigger>
        <TabsTrigger
          value="my-profile"
          hidden={!isSelf}
          className="h-8 min-h-8 flex-none shrink-0 gap-1.5 rounded-md px-2.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          <UserCircle className="h-3 w-3" />
          My Profile
        </TabsTrigger>
        <TabsTrigger
          value="profile"
          className="h-8 min-h-8 flex-none shrink-0 gap-1.5 rounded-md px-2.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
        >
          <FileCheck className="h-3 w-3" />
          Edit
        </TabsTrigger>
      </TabsList>
    );
  },
);
