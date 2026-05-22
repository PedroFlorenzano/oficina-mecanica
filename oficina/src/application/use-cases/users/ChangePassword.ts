import bcrypt from "bcryptjs";
import { IUserRepository } from "@/domain/repositories/IUserRepository";
import { PasswordValidator } from "@/domain/value-objects/PasswordValidator";
import { NotFoundError, ValidationError } from "@/domain/errors/DomainError";

export class ChangePassword {
  constructor(private userRepo: IUserRepository) {}

  /**
   * Changes the password for the authenticated user.
   *
   * The tenantId is required because IUserRepository.findById scopes queries
   * by tenant. The API route obtains it from the authenticated session and
   * passes it here along with the userId.
   */
  async execute(
    userId: string,
    currentPassword: string,
    newPassword: string,
    tenantId: string
  ): Promise<void> {
    // 1. Fetch user — throws NotFoundError if not found
    const user = await this.userRepo.findById(userId, tenantId);
    if (!user) {
      throw new NotFoundError("Usuário", userId);
    }

    // 2. Verify current password
    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      throw new ValidationError("Senha atual incorreta.");
    }

    // 3. Validate new password complexity
    PasswordValidator.validate(newPassword);

    // 4. Hash new password and persist
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.userRepo.update(userId, { password: hashed });

    // 5. Reset lockout counters
    await this.userRepo.resetLoginCounters(userId);
  }
}
