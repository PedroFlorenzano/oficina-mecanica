import { RegisterTenantDTO } from "@/application/dtos/RegisterTenantDTO";
import { CNPJ } from "@/domain/value-objects/CNPJ";
import { Email } from "@/domain/value-objects/Email";
import { PasswordValidator } from "@/domain/value-objects/PasswordValidator";
import { ValidationError, ConflictError } from "@/domain/errors/DomainError";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

interface RegisterTenantResult {
  tenantId: string;
  tenantName: string;
  adminEmail: string;
}

export class RegisterTenant {
  constructor(private readonly db: PrismaClient) {}

  async execute(input: RegisterTenantDTO): Promise<RegisterTenantResult> {
    // Validate inputs
    if (!input.officeName || input.officeName.trim().length < 3) {
      throw new ValidationError("Nome da oficina deve ter pelo menos 3 caracteres.");
    }

    const cnpj = CNPJ.create(input.cnpj);
    const email = Email.create(input.adminEmail);
    PasswordValidator.validate(input.adminPassword);

    if (!input.adminName || input.adminName.trim().length < 3) {
      throw new ValidationError("Nome do administrador deve ter pelo menos 3 caracteres.");
    }

    // Check CNPJ uniqueness
    const existingTenant = await this.db.tenant.findUnique({
      where: { cnpj: cnpj.toString() },
    });
    if (existingTenant) {
      throw new ConflictError("Já existe uma oficina cadastrada com este CNPJ.");
    }

    // Check email uniqueness
    const existingUser = await this.db.user.findUnique({
      where: { email: email.toString() },
    });
    if (existingUser) {
      throw new ConflictError("E-mail já está em uso.");
    }

    // Create tenant + admin user in a transaction
    const hashedPassword = await bcrypt.hash(input.adminPassword, 10);

    const trialExpires = new Date();
    trialExpires.setDate(trialExpires.getDate() + 15);

    // Generate slug from office name
    const baseSlug = input.officeName.trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 30);
    let slug = baseSlug;
    let suffix = 1;
    while (await this.db.tenant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    const tenant = await this.db.tenant.create({
      data: {
        name: input.officeName.trim(),
        slug,
        cnpj: cnpj.toString(),
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
        plan: "trial",
        planExpiresAt: trialExpires,
        billingStatus: "active",
        users: {
          create: {
            name: input.adminName.trim(),
            email: email.toString(),
            password: hashedPassword,
            role: "ADMIN",
            active: true,
            commissionRate: 0,
            failedLoginCount: 0,
          },
        },
      },
    });

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      adminEmail: email.toString(),
    };
  }
}
