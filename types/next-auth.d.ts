
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: "OWNER" | "ADMIN" | "MEMBER" | "CLIENT";
      forceChangePassword?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "OWNER" | "ADMIN" | "MEMBER" | "CLIENT";
    forceChangePassword?: boolean;
    id?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "OWNER" | "ADMIN" | "MEMBER" | "CLIENT";
    forceChangePassword?: boolean;
  }
}
