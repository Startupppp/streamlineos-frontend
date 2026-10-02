import Link from "next/link";
import { Network } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const ORG_HIERARCHY_SETTINGS_HREF = "/settings/organization/structure";

export const ORG_HIERARCHY_COMPAT_TITLE = "Departments, teams and locations moved";

export function OrgHierarchyCompatBanner() {
  return (
    <Alert className="mb-4">
      <Network className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>{ORG_HIERARCHY_COMPAT_TITLE}</AlertTitle>
      <AlertDescription>
        <span>
          This page keeps job roles and job levels. Renaming or adding a
          department, team, branch or location now happens in Organization
          settings, which is the only place those writes are made.
        </span>
        <Link
          href={ORG_HIERARCHY_SETTINGS_HREF}
          className="font-medium underline underline-offset-2"
        >
          Open Organization structure
        </Link>
      </AlertDescription>
    </Alert>
  );
}
