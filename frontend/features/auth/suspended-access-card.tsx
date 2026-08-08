"use client";

import { useCallback, useState } from "react";
import { ArrowRight, Building2, RefreshCw, ShieldAlert } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  useGetOrganizations,
  useSignOut,
  useSwitchOrg,
} from "@/hooks/common/auth-hooks";
import { clearBackendTokenCache } from "@/lib/api-client";

type SuspendedAccessCardProps = {
  organizationName: string | null;
};

type OrganizationRowProps = {
  organization: { id: string; name: string; role: string };
  disabled: boolean;
  isSwitching: boolean;
  onSelect: (organizationId: string) => void;
};

function OrganizationRow({
  organization,
  disabled,
  isSwitching,
  onSelect,
}: OrganizationRowProps) {
  const handleSelect = useCallback(() => {
    onSelect(organization.id);
  }, [onSelect, organization.id]);

  return (
    <button
      type="button"
      className="group flex w-full items-center gap-3 rounded-lg border border-transparent bg-white px-3 py-2.5 text-left shadow-sm transition-colors hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
      onClick={handleSelect}
      disabled={disabled}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Building2 className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-900">
          {organization.name}
        </span>
        <span className="block text-xs text-slate-500">
          {formatOrganizationRole(organization.role)}
        </span>
      </span>
      {isSwitching ? (
        <RefreshCw
          className="size-4 shrink-0 animate-spin text-slate-500"
          aria-hidden="true"
        />
      ) : (
        <ArrowRight
          className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

function formatOrganizationRole(role: string): string {
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function SuspendedAccessCard({
  organizationName,
}: SuspendedAccessCardProps) {
  const { update } = useSession();
  const signOut = useSignOut();
  const switchOrg = useSwitchOrg();
  const {
    data: availableOrganizations = [],
    isLoading: isLoadingOrganizations,
    isError: organizationsError,
    isFetching: isFetchingOrganizations,
    refetch: refetchOrganizations,
  } = useGetOrganizations();
  const [isChecking, setIsChecking] = useState(false);
  const isBusy = isChecking || signOut.isPending || switchOrg.isPending;

  const handleRetryOrganizations = useCallback(() => {
    void refetchOrganizations();
  }, [refetchOrganizations]);

  const handleSwitchOrganization = useCallback(
    (organizationId: string) => {
      switchOrg.mutate(organizationId);
    },
    [switchOrg],
  );

  const handleSignOut = useCallback(() => {
    signOut.mutate();
  }, [signOut]);

  const handleCheckAgain = useCallback(async () => {
    if (isChecking) return;
    setIsChecking(true);
    clearBackendTokenCache();

    try {
      const fresh = await update();
      if (fresh?.organizationAccess === "suspended") {
        toast.info("Access has not been restored yet", {
          description: "Ask an organization admin to reactivate your membership.",
        });
        return;
      }

      window.location.replace(fresh?.orgId ? "/dashboard" : "/org-setup");
    } catch {
      toast.error("We couldn't check your access", {
        description: "Check your connection and try again.",
      });
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, update]);

  return (
    <section
      className="w-full max-w-md animate-fade-up"
      aria-labelledby="suspended-access-title"
    >
      <div className="rounded-2xl border border-amber-200/80 bg-white p-6 shadow-[0_20px_55px_-28px_rgba(120,53,15,0.3)] sm:p-8">
        <div className="flex size-12 items-center justify-center rounded-xl bg-amber-50 ring-1 ring-amber-200/80">
          <ShieldAlert className="size-6 text-amber-700" aria-hidden="true" />
        </div>

        <div className="mt-5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            Access paused
          </p>
          <h1
            id="suspended-access-title"
            className="font-display text-2xl font-bold tracking-tight text-slate-950"
          >
            Your organization access is suspended
          </h1>
          <p className="text-sm leading-6 text-slate-600">
            {organizationName ? (
              <>
                An administrator paused your access to{" "}
                <span className="font-semibold text-slate-800">
                  {organizationName}
                </span>
                .
              </>
            ) : (
              "An administrator paused your organization access."
            )}{" "}
            You can&apos;t open or change this workspace until your membership is
            restored.
          </p>
        </div>

        {organizationsError ? (
          <div
            className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3"
            role="alert"
          >
            <p className="text-sm font-medium text-rose-900">
              We couldn&apos;t check your other organizations
            </p>
            <p className="mt-1 text-xs leading-5 text-rose-700">
              Your access data is unchanged. Check your connection and try
              again.
            </p>
            <LoadingButton
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              isPending={isFetchingOrganizations}
              loadingText="Retrying…"
              disabled={isBusy}
              onClick={handleRetryOrganizations}
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Retry
            </LoadingButton>
          </div>
        ) : availableOrganizations.length > 0 ? (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-2">
            <div className="px-2 pb-2 pt-1">
              <p className="text-sm font-semibold text-slate-800">
                Continue in another organization
              </p>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">
                Your access there is still active.
              </p>
            </div>
            <div className="space-y-1">
              {availableOrganizations.map((organization) => (
                <OrganizationRow
                  key={organization.id}
                  organization={organization}
                  disabled={isBusy}
                  isSwitching={
                    switchOrg.isPending &&
                    switchOrg.variables === organization.id
                  }
                  onSelect={handleSwitchOrganization}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-medium text-slate-800">
              Your account and organization data are safe.
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {isLoadingOrganizations
                ? "Checking for other organizations you can access…"
                : "Contact an organization owner or admin, then check again here. You do not need to create a new organization."}
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <LoadingButton
            type="button"
            className="flex-1"
            isPending={isChecking}
            loadingText="Checking access…"
            onClick={handleCheckAgain}
            disabled={isBusy}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Check access again
          </LoadingButton>
          <LoadingButton
            type="button"
            variant="outline"
            className="flex-1"
            isPending={signOut.isPending}
            loadingText="Signing out…"
            onClick={handleSignOut}
            disabled={isBusy}
          >
            Use another account
          </LoadingButton>
        </div>
      </div>
    </section>
  );
}
