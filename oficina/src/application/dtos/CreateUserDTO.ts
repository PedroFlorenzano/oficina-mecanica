import type { Role } from "@prisma/client";

export interface CreateUserDTO {
  name: string;
  email: string;
  role: Role;
  password: string;
}
