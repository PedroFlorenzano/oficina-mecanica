import "next-auth";
import "next-auth/jwt";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      userId: string;
      tenantId: string;
      role: Role;
      name: string;
      email: string;
    };
  }

  interface User {
    userId: string;
    tenantId: string;
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    tenantId: string;
    role: Role;
  }
}
