import type { Session } from "next-auth";

export type AuthResult =
  | { error: "Unauthorized" | "Not a member" }
  | {
      session: Session;
      member: {
        id: number;
        orgId: string;
        userId: string;
        role: "OWNER" | "ADMIN" | "MEMBER";
        joinedAt: Date | null;
      };
      isAdmin: boolean;
      userId: string;
      orgId: string;
    };

export function isAuthError(result: AuthResult): result is { error: "Unauthorized" | "Not a member" } {
  return "error" in result;
}
