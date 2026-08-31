import { z } from "zod";
import { CRM_MCP_SCOPE_GROUPS } from "./mcp-scopes";

export const CRM_MCP_EXPIRY_OPTIONS = [
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "1 year" },
] as const;

const scopeValues = CRM_MCP_SCOPE_GROUPS.map((group) => group.value);

export const mcpTokenSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100),
    scopeGroup: z.enum(scopeValues),
    expiresInDays: z.enum(CRM_MCP_EXPIRY_OPTIONS.map((option) => option.value)),
  })
  .strict();

export type McpTokenFormValues = z.infer<typeof mcpTokenSchema>;
