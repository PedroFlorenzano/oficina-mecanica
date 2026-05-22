import bcrypt from "bcryptjs";
import { IUserRepository } from "@/domain/repositories/IUserRepository";
import { AuthenticationError } from "@/domain/errors/DomainError";
import type { Role } from "@prisma/client";

export interface UserPayload {
  userId: string;
  tenantId: string;
  role: Role;
  name: string;
  email: string;
}

export class LoginUser {
  constructor(private userRepo: IUserRepository) {}

  async execute(email: string, password: string): Promise<UserPayload | null> {
    // 1. Find user by email — return null to avoid revealing if email exists
    const user = await this.userRepo.findByEmail(email);
    if (!user) return null;

    // 2. Reject if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AuthenticationError(
        "Conta temporariamente bloqueada. Tente novamente mais tarde."
      );
    }

    // 3. Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      if (user.failedLoginCount + 1 >= 5) {
        await this.userRepo.lockAccount(
          user.id,
          new Date(Date.now() + 15 * 60 * 1000)
        );
      } else {
        await this.userRepo.incrementFailedLoginCount(user.id);
      }
      return null;
    }

    // 4. Reject inactive users
    if (!user.active) return null;

    // 5. Reset lockout counters on successful login
    await this.userRepo.resetLoginCounters(user.id);

    // 6. Return session payload
    return {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      name: user.name,
      email: user.email,
    };
  }
}
