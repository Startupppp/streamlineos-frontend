"use client";

import dynamic from "next/dynamic";

/**
 * Mounted only once someone asks to leave — the confirmation carries its own
 * form and mutation, and a member who never opens it should not download it.
 */
const LeaveOrganizationDialog = dynamic(
  () =>
    import("@/components/organization/leave-organization-control").then(
      (m) => m.LeaveOrganizationDialog,
    ),
  { ssr: false },
);

/**
 * The create-workspace form is the shell's only eager react-hook-form +
 * zodResolver tree, and it cannot paint until someone opens it — so it mounts
 * on first open rather than on hydration, which is what keeps its chunk out of
 * a cold authenticated load rather than merely out of the first-load manifest.
 */
const CreateWorkspaceDialog = dynamic(
  () =>
    import("@/components/layout/header/create-workspace-dialog").then(
      (m) => m.CreateWorkspaceDialog,
    ),
  { ssr: false },
);

/**
 * The switcher body is only ever rendered inside an open menu, so it is fetched
 * on first open rather than on hydration — it carries the organisation list, the
 * archived-org restore control and the leave-organisation item, none of which a
 * cold authenticated load can show.
 */
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
