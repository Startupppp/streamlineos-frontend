import type {
  OrganizationPerson,
  PersonAccountAccess,
} from "@/types/directory/people";

export type PersonAccessBadgeTone =
  | "success"
  | "warning"
  | "danger"
  | "neutral";

export function getPersonAccountAccess(
  person: OrganizationPerson,
): PersonAccountAccess {
  if (person.userId || typeof person.organizationMembershipId === "number")
    return { state: "MEMBER" };

  return person.accountAccess ?? { state: "NONE" };
}

export function getPersonAccessBadge(person: OrganizationPerson): string {
  const access = getPersonAccountAccess(person);
  if (access.state === "MEMBER") return "Member linked";
  if (access.state === "INVITED") {
    return access.invitationStatus === "EXPIRED"
      ? "Invitation expired"
      : "Invitation pending";
  }
  return "Directory only";
}

export function getPersonAccessBadgeTone(
  person: OrganizationPerson,
): PersonAccessBadgeTone {
  const access = getPersonAccountAccess(person);
  if (access.state === "MEMBER") return "success";
  if (access.state === "INVITED") {
    return access.invitationStatus === "EXPIRED" ? "danger" : "warning";
  }
  return "neutral";
}

export function getInvitationManagementHref(
  access: PersonAccountAccess,
): string | null {
  if (access.state !== "INVITED") return null;

  const params = new URLSearchParams({
    view: "invitations",
    q: access.email,
    status: access.invitationStatus.toLowerCase(),
  });
  return `/settings/users?${params.toString()}`;
}
