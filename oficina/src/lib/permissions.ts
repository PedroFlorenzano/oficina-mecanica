export type Role = "ADMIN" | "ATTENDANT" | "MECHANIC";

export type Resource =
  | "clients"
  | "vehicles"
  | "orders"
  | "stock"
  | "services"
  | "pista"
  | "users"
  | "commissions"
  | "reports"
  | "whatsapp"
  | "fiscal";

export type Permission = "create" | "read" | "update" | "delete";

export type CustomPermissions = Partial<Record<Resource, Permission[]>>;

// Recursos configuráveis pelo ADMIN para mecânicos
export const configurableResources: { resource: Resource; label: string }[] = [
  { resource: "clients", label: "Clientes" },
  { resource: "vehicles", label: "Veículos" },
  { resource: "orders", label: "Ordens de Serviço" },
  { resource: "stock", label: "Estoque" },
  { resource: "services", label: "Catálogo de Serviços" },
  { resource: "pista", label: "Pista" },
  { resource: "commissions", label: "Comissões" },
];

export const allPermissions: { value: Permission; label: string }[] = [
  { value: "read", label: "Visualizar" },
  { value: "create", label: "Criar" },
  { value: "update", label: "Editar" },
  { value: "delete", label: "Excluir" },
];

const matrix: Record<Role, Record<Resource, Permission[]>> = {
  ADMIN: {
    clients: ["create", "read", "update", "delete"],
    vehicles: ["create", "read", "update", "delete"],
    orders: ["create", "read", "update", "delete"],
    stock: ["create", "read", "update", "delete"],
    services: ["create", "read", "update", "delete"],
    pista: ["read", "update"],
    users: ["create", "read", "update", "delete"],
    commissions: ["create", "read", "update", "delete"],
    reports: ["read"],
    whatsapp: ["read", "update"],
    fiscal: ["create", "read", "update"],
  },
  ATTENDANT: {
    clients: ["create", "read", "update", "delete"],
    vehicles: ["create", "read", "update", "delete"],
    orders: ["create", "read", "update", "delete"],
    stock: ["read"],
    services: ["create", "read", "update"],
    pista: ["read", "update"],
    users: [],
    commissions: [],
    reports: [],
    whatsapp: ["read"],
    fiscal: ["read"],
  },
  MECHANIC: {
    clients: [],
    vehicles: [],
    orders: ["read"],
    stock: ["read"],
    services: [],
    pista: ["read"],
    users: [],
    commissions: ["read"],
    reports: [],
    whatsapp: [],
    fiscal: [],
  },
};

export function hasPermission(
  role: Role,
  resource: Resource,
  permission: Permission,
  customPermissions?: CustomPermissions | null
): boolean {
  // ADMIN sempre tem acesso total, ignora custom
  if (role === "ADMIN") return matrix.ADMIN[resource]?.includes(permission) ?? false;

  // Se há permissões customizadas para o recurso, usa elas
  if (customPermissions && resource in customPermissions) {
    return customPermissions[resource]?.includes(permission) ?? false;
  }

  // Fallback para a matriz padrão do role
  return matrix[role]?.[resource]?.includes(permission) ?? false;
}

export function parseCustomPermissions(json: string | null | undefined): CustomPermissions | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as CustomPermissions;
  } catch {
    return null;
  }
}
