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
        className="overflow-visible"
      >
        <TabsTrigger
          value="overview"
          className="gap-1.5 px-2.5 text-xs"
        >
          <Briefcase className="h-3 w-3" />
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="attendance"
          className="gap-1.5 px-2.5 text-xs"
        >
          <Clock className="h-3 w-3" />
          Attendance
        </TabsTrigger>
        <TabsTrigger
          value="timeline"
          className="gap-1.5 px-2.5 text-xs"
        >
          <Clock className="h-3 w-3" />
          Timeline
        </TabsTrigger>
        <TabsTrigger
          value="sensitive"
          hidden={!showSensitiveTab}
          className="gap-1.5 px-2.5 text-xs"
        >
          <Shield className="h-3 w-3" />
          Sensitive
        </TabsTrigger>
        <TabsTrigger
          value="my-profile"
          hidden={!isSelf}
          className="gap-1.5 px-2.5 text-xs"
        >
          <UserCircle className="h-3 w-3" />
          My Profile
        </TabsTrigger>
        <TabsTrigger
          value="profile"
          className="gap-1.5 px-2.5 text-xs"
        >
          <FileCheck className="h-3 w-3" />
          Edit
        </TabsTrigger>
      </TabsList>
    );
  },
);
