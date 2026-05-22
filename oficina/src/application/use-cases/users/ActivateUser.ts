import { IUserRepository, UserData } from "@/domain/repositories/IUserRepository";
import { NotFoundError } from "@/domain/errors/DomainError";

export class ActivateUser {
  constructor(private userRepo: IUserRepository) {}

  async execute(id: string, tenantId: string): Promise<UserData> {
    const user = await this.userRepo.findById(id, tenantId);
    if (!user) {
      throw new NotFoundError("Usuário", id);
    }

    return this.userRepo.update(id, {
      active: true,
      failedLoginCount: 0,
      lockedUntil: null,
    });
  }
}
