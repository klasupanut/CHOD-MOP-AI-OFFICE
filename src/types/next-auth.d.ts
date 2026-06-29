import type { DefaultSession } from "next-auth";
import type { Role } from "@/lib/auth/permissions";

declare module "next-auth" {
  interface Session {
    user: {
      role?: Role;
      provider?: string;
    } & DefaultSession["user"];
  }
}

