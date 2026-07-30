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
        className="h-auto w-max min-w-full overflow-visible md:min-w-0"
      >
        <TabsTrigger
          value="overview"
          className="h-8 min-h-8 flex-none gap-1.5 px-2.5 text-xs"
        >
          <Briefcase className="h-3 w-3" />
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="attendance"
          className="h-8 min-h-8 flex-none gap-1.5 px-2.5 text-xs"
        >
          <Clock className="h-3 w-3" />
          Attendance
        </TabsTrigger>
        <TabsTrigger
          value="timeline"
          className="h-8 min-h-8 flex-none gap-1.5 px-2.5 text-xs"
        >
          <Clock className="h-3 w-3" />
          Timeline
        </TabsTrigger>
        <TabsTrigger
          value="sensitive"
          hidden={!showSensitiveTab}
          className="h-8 min-h-8 flex-none gap-1.5 px-2.5 text-xs"
        >
          <Shield className="h-3 w-3" />
          Sensitive
        </TabsTrigger>
        <TabsTrigger
          value="my-profile"
          hidden={!isSelf}
          className="h-8 min-h-8 flex-none gap-1.5 px-2.5 text-xs"
        >
          <UserCircle className="h-3 w-3" />
          My Profile
        </TabsTrigger>
        <TabsTrigger
          value="profile"
          className="h-8 min-h-8 flex-none gap-1.5 px-2.5 text-xs"
        >
          <FileCheck className="h-3 w-3" />
          Edit
        </TabsTrigger>
      </TabsList>
    );
  },
);
