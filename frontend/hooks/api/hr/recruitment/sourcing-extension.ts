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
