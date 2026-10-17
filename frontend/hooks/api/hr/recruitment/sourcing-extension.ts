"use client";

import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import type { ExtensionToken } from "@/hooks/api/hr/recruitment/sourcing-extension-schema";

export type { ExtensionToken };

const extensionTokenC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/sourcing-extension-schema").then(
    (m) => m.extensionTokenContract,
  ),
);

export interface IssueExtensionTokenInput {
  label?: string;
  expiresInHours?: number;
}

/**
 * Gated on `settings:api-tokens:write`, matching the route — and that key is
 * the point rather than an accident of naming.
 *
 * `settings:` is non-delegable, so no personal token can reach this endpoint
 * whatever scopes it carries. Issuing a sourcing token therefore always
 * requires a signed-in recruiter, and a leaked extension token cannot mint its
 * own replacement.
 */
export function useIssueExtensionToken() {
  return useAuthorizedMutation("settings:api-tokens:write", {
    mutationKey: ["hr", "recruitment", "sourcing", "extension-token"],
    mutationFn: (input: IssueExtensionTokenInput) =>
      apiClient.post<ExtensionToken>(
        "/hr/recruitment/sourcing/extension-token",
        input,
        undefined,
        extensionTokenC,
      ),
  });
}
