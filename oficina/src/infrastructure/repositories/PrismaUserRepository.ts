import { PrismaClient } from "@prisma/client";
import { IUserRepository, UserData } from "@/domain/repositories/IUserRepository";

export class PrismaUserRepository implements IUserRepository {
  // Defense in depth: RLS também filtra no banco
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string, tenantId: string): Promise<UserData | null> {
    return this.db.user.findFirst({ where: { id, tenantId } }) as Promise<UserData | null>;
  }

  async findByEmail(email: string): Promise<UserData | null> {
    return this.db.user.findUnique({ where: { email } }) as Promise<UserData | null>;
  }

  async findAll(tenantId: string): Promise<UserData[]> {
    return this.db.user.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    }) as Promise<UserData[]>;
  }

  async create(data: Omit<UserData, "id" | "createdAt" | "updatedAt">): Promise<UserData> {
    return this.db.user.create({ data }) as Promise<UserData>;
  }

  async update(
    id: string,
    data: Partial<Omit<UserData, "id" | "createdAt" | "updatedAt">>
  ): Promise<UserData> {
    return this.db.user.update({ where: { id }, data }) as Promise<UserData>;
  }

  async incrementFailedLoginCount(id: string): Promise<UserData> {
    return this.db.user.update({
      where: { id },
      data: { failedLoginCount: { increment: 1 } },
    }) as Promise<UserData>;
  }

  async lockAccount(id: string, lockedUntil: Date): Promise<UserData> {
    return this.db.user.update({
      where: { id },
      data: { lockedUntil, failedLoginCount: 5 },
    }) as Promise<UserData>;
  }

  async resetLoginCounters(id: string): Promise<UserData> {
    return this.db.user.update({
      where: { id },
      data: { failedLoginCount: 0, lockedUntil: null },
    }) as Promise<UserData>;
  }
}
