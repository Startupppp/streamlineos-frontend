import type { Permission } from "./types";

export const SIGN_PERMISSIONS: Permission[] = [
  { name: "sign:bulk_send:run", resource: "sign:bulk_send", action: "run", description: "Run SignOS bulk send jobs" },
  { name: "sign:envelope:view_all", resource: "sign:envelope", action: "view_all", description: "View all SignOS envelopes in the organization" },
];
