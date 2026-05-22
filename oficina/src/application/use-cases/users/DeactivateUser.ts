import { IUserRepository, UserData } from "@/domain/repositories/IUserRepository";
import { BusinessRuleError, NotFoundError } from "@/domain/errors/DomainError";

export class DeactivateUser {
  constructor(private userRepo: IUserRepository) {}

  async execute(
    id: string,
    tenantId: string,
    requestingUserId: string
  ): Promise<UserData> {
    // Prevent self-deactivation
    if (id === requestingUserId) {
      throw new BusinessRuleError("Não é possível desativar o próprio usuário.");
    }

    const user = await this.userRepo.findById(id, tenantId);
    if (!user) {
      throw new NotFoundError("Usuário", id);
    }

    return this.userRepo.update(id, { active: false });
  }
}
