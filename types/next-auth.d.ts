
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
      forceChangePassword?: boolean;
      isActive?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    forceChangePassword?: boolean;
    id?: string;
    isActive?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    forceChangePassword?: boolean;
    isActive?: boolean;
    image?: string | null;
  }
}
