import { lazyContract } from "@/lib/api-envelope";

export const requestLeaveC = lazyContract(() =>
  import("@/hooks/api/hr/leaves-schema").then((m) => m.requestLeaveContract),
);
export const leaveApproveC = lazyContract(() =>
  import("@/hooks/api/hr/leaves-schema").then((m) => m.leaveApproveContract),
);
export const leaveRejectC = lazyContract(() =>
  import("@/hooks/api/hr/leaves-schema").then((m) => m.leaveRejectContract),
);
export const leaveCancelC = lazyContract(() =>
  import("@/hooks/api/hr/leaves-schema").then((m) => m.leaveCancelContract),
);
export const leaveRevertC = lazyContract(() =>
  import("@/hooks/api/hr/leaves-schema").then((m) => m.leaveRevertContract),
);
export const leaveTypesListC = lazyContract(() =>
  import("@/hooks/api/hr/leaves-schema").then((m) => m.leaveTypesListContract),
);
export const seedLeaveTypesC = lazyContract(() =>
  import("@/hooks/api/hr/leaves-schema").then((m) => m.seedLeaveTypesContract),
);
export const updateLeaveTypeC = lazyContract(() =>
  import("@/hooks/api/hr/leaves-schema").then((m) => m.updateLeaveTypeContract),
);
export const deleteLeaveTypeC = lazyContract(() =>
  import("@/hooks/api/hr/leaves-schema").then((m) => m.deleteLeaveTypeContract),
);
export const createLeaveTypeC = lazyContract(() =>
  import("@/hooks/api/hr/leaves-schema").then((m) => m.createLeaveTypeContract),
);
export const leaveContextC = lazyContract(() =>
  import("@/hooks/api/hr/leaves-schema").then((m) => m.leaveContextContract),
);
export const leaveApprovalsC = lazyContract(() =>
  import("@/hooks/api/hr/leaves-schema").then((m) => m.leaveApprovalsContract),
);
export const leavesThisWeekC = lazyContract(() =>
  import("@/hooks/api/hr/leaves-schema").then((m) => m.leavesThisWeekContract),
);
export const leaveRequestsPageC = lazyContract(() =>
  import("@/hooks/api/hr/leaves-schema").then((m) => m.leaveRequestsPageContract),
);
export const addHolidayC = lazyContract(() =>
  import("@/hooks/api/hr/leaves-schema").then((m) => m.addHolidayContract),
);
export const deleteHolidayC = lazyContract(() =>
  import("@/hooks/api/hr/leaves-schema").then((m) => m.deleteHolidayContract),
);
export const updateHolidayC = lazyContract(() =>
  import("@/hooks/api/hr/leaves-schema").then((m) => m.updateHolidayContract),
);
export const hrHolidaysListC = lazyContract(() =>
  import("@/hooks/api/hr/leaves-schema").then((m) => m.hrHolidaysListContract),
);
export const leaveAnalyticsC = lazyContract(() =>
  import("@/hooks/api/hr/leaves-schema").then((m) => m.leaveAnalyticsContract),
);
export const leavePolicyC = lazyContract(() =>
  import("@/hooks/api/hr/leaves-schema").then((m) => m.leavePolicyContract),
);
