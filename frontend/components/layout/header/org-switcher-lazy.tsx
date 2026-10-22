"use client";

import dynamic from "next/dynamic";

const LeaveOrganizationDialog = dynamic(
  () =>
    import("@/components/organization/leave-organization-control").then(
      (m) => m.LeaveOrganizationDialog,
    ),
  { ssr: false },
);

const CreateWorkspaceDialog = dynamic(
  () =>
    import("@/components/layout/header/create-workspace-dialog").then(
      (m) => m.CreateWorkspaceDialog,
    ),
  { ssr: false },
);

const OrganizationSwitcherPanel = dynamic(
  () =>
    import("@/components/layout/header/org-switcher-panel").then(
      (m) => m.OrganizationSwitcherPanel,
    ),
  { ssr: false },
);

export {
  CreateWorkspaceDialog,
  LeaveOrganizationDialog,
  OrganizationSwitcherPanel,
};
