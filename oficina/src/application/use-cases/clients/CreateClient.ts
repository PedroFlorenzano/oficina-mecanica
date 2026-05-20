import { IClientRepository, ClientData } from "@/domain/repositories/IClientRepository";
import { CreateClientDTO } from "@/application/dtos/CreateClientDTO";
import { Document } from "@/domain/value-objects/Document";
import { ConflictError, ValidationError } from "@/domain/errors/DomainError";

export class CreateClient {
  constructor(private clientRepo: IClientRepository) {}

  async execute(input: CreateClientDTO, tenantId: string): Promise<ClientData> {
    if (!input.name || input.name.trim().length < 3) {
      throw new ValidationError("Nome deve ter pelo menos 3 caracteres");
    }

    const document = Document.create(input.document);

    const existing = await this.clientRepo.findByDocument(document.toString(), tenantId);
    if (existing) {
      throw new ConflictError("Já existe um cliente cadastrado com este documento");
    }

    if (document.isCNPJ() && !input.address) {
      throw new ValidationError("Endereço é obrigatório para pessoa jurídica");
    }

    return this.clientRepo.create({
      name: input.name.trim(),
      document: document.toString(),
      docType: document.type,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
      tenantId,
    });
  }
}
