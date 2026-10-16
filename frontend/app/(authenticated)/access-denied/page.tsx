import {
  DeniedView,
  type DeniedResolution,
} from "@/components/shared/page-state-views";
import { fromModuleDenial } from "@/lib/page-state/resolve-page-state";
import { moduleDenialReasonContract } from "@/lib/page-state/page-state-schema";
import { isPermissionKey } from "@/contracts/permission-key.generated";
import { NoPermissionState } from "@/components/shared/no-permission-state";

const MODULE_REQUIRED_PREFIX = "module:";

interface AccessDeniedSearchParams {
  required?: string;
  from?: string;
  reason?: string;
}

interface AccessDeniedPageProps {
  searchParams: Promise<AccessDeniedSearchParams>;
}

export const metadata = { title: "Access Denied | StreamlineOS" };

function resolveAccessDeniedState(
  required: string | undefined,
  reason: string | undefined,
): DeniedResolution {
  if (!required) return { kind: "denied", permission: null };

  if (required.startsWith(MODULE_REQUIRED_PREFIX)) {
    const moduleKey = required.slice(MODULE_REQUIRED_PREFIX.length);
    const parsedReason = moduleDenialReasonContract.safeParse(reason);
    return fromModuleDenial(
      moduleKey,
      parsedReason.success ? parsedReason.data : "org-disabled",
      null,
    );
  }

  return { kind: "denied", permission: isPermissionKey(required) ? required : null };
}

export default async function AccessDeniedPage({ searchParams }: AccessDeniedPageProps) {
  const { required, reason } = await searchParams;
  const anyOf = required?.includes(",") ? required.split(",").filter(isPermissionKey) : [];
  if (anyOf.length > 0) return <NoPermissionState permission={anyOf} />;
  return <DeniedView resolution={resolveAccessDeniedState(required, reason)} />;
}
