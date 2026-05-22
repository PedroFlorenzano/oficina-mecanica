import bcrypt from "bcryptjs";
import { IUserRepository, UserData } from "@/domain/repositories/IUserRepository";
import { CreateUserDTO } from "@/application/dtos/CreateUserDTO";
import { Email } from "@/domain/value-objects/Email";
import { PasswordValidator } from "@/domain/value-objects/PasswordValidator";
import { ConflictError, ValidationError } from "@/domain/errors/DomainError";

export class CreateUser {
  constructor(private userRepo: IUserRepository) {}

  async execute(
    input: CreateUserDTO,
    tenantId: string,
    requestingUserId: string
  ): Promise<UserData> {
    // Validate name
    if (!input.name || input.name.trim().length < 3) {
      throw new ValidationError("Nome deve ter pelo menos 3 caracteres.");
    }

    // Validate email format via value object
    const emailVO = Email.create(input.email);
    const normalizedEmail = emailVO.toString();

    // Validate password complexity
    PasswordValidator.validate(input.password);

    // Check email uniqueness within the same tenant
    const existing = await this.userRepo.findByEmail(normalizedEmail);
    if (existing && existing.tenantId === tenantId) {
      throw new ConflictError("E-mail já cadastrado neste tenant.");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(input.password, 10);

    return this.userRepo.create({
      name: input.name.trim(),
      email: normalizedEmail,
      role: input.role,
      password: hashedPassword,
      active: true,
      commissionRate: input.role === "MECHANIC" && input.commissionRate ? input.commissionRate : 0,
      tenantId,
      failedLoginCount: 0,
      lockedUntil: null,
    });
  }
}
