import type { Role } from "@prisma/client";

export interface UserData {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  active: boolean;
  commissionRate: number;
  customPermissions: string | null;
  tenantId: string;
  failedLoginCount: number;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserRepository {
  findById(id: string, tenantId: string): Promise<UserData | null>;
  findByEmail(email: string): Promise<UserData | null>;
  findAll(tenantId: string): Promise<UserData[]>;
  create(data: Omit<UserData, "id" | "createdAt" | "updatedAt">): Promise<UserData>;
  update(id: string, data: Partial<Omit<UserData, "id" | "createdAt" | "updatedAt">>): Promise<UserData>;
  incrementFailedLoginCount(id: string): Promise<UserData>;
  lockAccount(id: string, lockedUntil: Date): Promise<UserData>;
  resetLoginCounters(id: string): Promise<UserData>;
}
