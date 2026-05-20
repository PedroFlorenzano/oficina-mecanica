export interface ClientData {
  id: string;
  name: string;
  document: string;
  docType: "CPF" | "CNPJ";
  phone: string | null;
  email: string | null;
  address: string | null;
  tenantId: string;
  vehicles?: { id: string; plate: string; brand: string; model: string; year: number; color: string | null; mileage: number }[];
  _count?: { vehicles: number; orders: number };
}

export interface IClientRepository {
  findById(id: string, tenantId: string): Promise<ClientData | null>;
  findByDocument(document: string, tenantId: string): Promise<ClientData | null>;
  search(query: string, tenantId: string): Promise<ClientData[]>;
  findAll(tenantId: string): Promise<ClientData[]>;
  create(data: Omit<ClientData, "id" | "vehicles" | "_count">): Promise<ClientData>;
  update(id: string, data: Partial<Omit<ClientData, "id" | "vehicles" | "_count">>): Promise<ClientData>;
}
