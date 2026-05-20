import { IClientRepository, ClientData } from "@/domain/repositories/IClientRepository";
import { CreateClientDTO } from "@/application/dtos/CreateClientDTO";
import { Document } from "@/domain/value-objects/Document";
import { ValidationError } from "@/domain/errors/DomainError";

export class UpdateClient {
  constructor(private clientRepo: IClientRepository) {}

  async execute(id: string, input: CreateClientDTO, tenantId: string): Promise<ClientData> {
    if (!input.name || input.name.trim().length < 3) {
      throw new ValidationError("Nome deve ter pelo menos 3 caracteres");
    }

    const document = Document.create(input.document);

    if (document.isCNPJ() && !input.address) {
      throw new ValidationError("Endereço é obrigatório para pessoa jurídica");
    }

    return this.clientRepo.update(id, {
      name: input.name.trim(),
      document: document.toString(),
      docType: document.type,
      phone: input.phone || null,
      email: input.email || null,
      address: input.address || null,
    });
  }
}
