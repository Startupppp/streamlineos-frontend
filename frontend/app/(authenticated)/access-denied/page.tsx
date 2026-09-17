import {
  DeniedView,
  type DeniedResolution,
} from "@/components/shared/page-state-views";
import { fromModuleDenial } from "@/lib/page-state/resolve-page-state";
import { moduleDenialReasonContract } from "@/lib/page-state/page-state-schema";

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

  return { kind: "denied", permission: required };
}

export default async function AccessDeniedPage({ searchParams }: AccessDeniedPageProps) {
  const { required, reason } = await searchParams;
  return <DeniedView resolution={resolveAccessDeniedState(required, reason)} />;
}
