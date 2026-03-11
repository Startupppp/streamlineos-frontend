
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
      forceChangePassword?: boolean;
      isActive?: boolean;
      hasDashboardAccess?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    forceChangePassword?: boolean;
    id?: string;
    isActive?: boolean;
    hasDashboardAccess?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    forceChangePassword?: boolean;
    isActive?: boolean;
    hasDashboardAccess?: boolean;
    image?: string | null;
  }
}
