// 2026-09-21: HR "Engagement" relabelled "Polls & engagement" (HRMS audit — the surface is polls,
// mood, communities and campaigns, not a survey programme); href and permission unchanged.
// 2026-09-21: "Recruitment OS" carved out of the HRMS product into its own top-level product
// (group.product/module "hrms" -> "recruitment"), matching CRM/Inventory/Finance; routes, hrefs
// and permissions unchanged.
// 2026-09-22: Build "Workspaces" href /build/pm-workspaces -> /build/workspaces and Build "Goals"
// href /build/goal -> /build/goals. Both route directories were renamed on disk so each index sits
// at the canonical path above its own detail route; next.config.ts redirects the old paths. Labels
// and permissions unchanged.
export const EXPECTED_NAVIGATION_INVENTORY_DIGEST =
  "d1a851f0edb658b2464094b1b37762681d60fff660f6ef4dce6049faabc22b7b";
