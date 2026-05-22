import type { Role } from "@prisma/client";

export interface UpdateUserDTO {
  name?: string;
  role?: Role;
  commissionRate?: number;
}
