import { IUserRepository, UserData } from "@/domain/repositories/IUserRepository";
import { UpdateUserDTO } from "@/application/dtos/UpdateUserDTO";
import { NotFoundError } from "@/domain/errors/DomainError";

export class UpdateUser {
  constructor(private userRepo: IUserRepository) {}

  async execute(
    id: string,
    data: UpdateUserDTO,
    tenantId: string
  ): Promise<UserData> {
    const user = await this.userRepo.findById(id, tenantId);
    if (!user) {
      throw new NotFoundError("Usuário", id);
    }

    const updatePayload: Partial<Pick<UserData, "name" | "role" | "commissionRate">> = {};
    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.role !== undefined) updatePayload.role = data.role;
    if (data.commissionRate !== undefined && (data.role ?? user.role) === "MECHANIC") {
      updatePayload.commissionRate = data.commissionRate;
    }

    return this.userRepo.update(id, updatePayload);
  }
}
