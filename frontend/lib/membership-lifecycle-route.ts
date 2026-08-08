type OrganizationAccess = "active" | "suspended" | "none" | undefined;

export function getMembershipLifecycleDestination(
  access: OrganizationAccess,
  pathname: string,
): string | null {
  if (access === "suspended" && pathname !== "/access-suspended") {
    return "/access-suspended";
  }

  if (access === "active" && pathname === "/access-suspended") {
    return "/dashboard";
  }

  return null;
}
