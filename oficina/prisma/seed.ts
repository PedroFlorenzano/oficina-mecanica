import { PrismaClient, OrderStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

// Seed usa PrismaClient direto (sem RLS) para criar dados em múltiplos tenants
const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL_ADMIN || process.env.DATABASE_URL,
});

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  // Limpar dados existentes (ordem inversa de dependências)
  await prisma.fiscalInvoiceItem.deleteMany();
  await prisma.fiscalInvoice.deleteMany();
  await prisma.fiscalConfig.deleteMany();
  await prisma.whatsAppMessage.deleteMany();
  await prisma.whatsAppConfig.deleteMany();
  await prisma.signature.deleteMany();
  await prisma.commissionItem.deleteMany();
  await prisma.commission.deleteMany();
  await prisma.timerAuditLog.deleteMany();
  await prisma.timerLog.deleteMany();
  await prisma.statusHistory.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.orderPart.deleteMany();
  await prisma.orderService.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.serviceOrder.deleteMany();
  await prisma.stockItem.deleteMany();
  await prisma.serviceCatalog.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // Tenant 1: Paiffer Bosch Car Service (piloto real)
  const tenant1 = await prisma.tenant.create({ data: { id: "tenant-paiffer", name: "Paiffer Bosch Car Service Peugeot", cnpj: "12345678000199", phone: "(15) 3456-7890", address: "Rua das Oficinas, 100 - Sorocaba/SP" } });

  // Tenant 2: Oficina Demo (dados sobrepostos para validar RLS)
  const tenant2 = await prisma.tenant.create({ data: { id: "tenant-demo", name: "Oficina Demo Ltda", cnpj: "98765432000188", phone: "(11) 9999-8888", address: "Av. Paulista, 1000 - São Paulo/SP" } });

  // Usuários
  await prisma.user.create({ data: { id: "user-admin-1", email: "admin@paiffer.com", password: passwordHash, name: "Administrador", role: "ADMIN", tenantId: tenant1.id } });
  const mech1 = await prisma.user.create({ data: { id: "user-mech-1", email: "mecanico@paiffer.com", password: passwordHash, name: "João Mecânico", role: "MECHANIC", commissionRate: 10, tenantId: tenant1.id } });
  const mech2 = await prisma.user.create({ data: { id: "user-mech-2", email: "carlos@paiffer.com", password: passwordHash, name: "Carlos Eletricista", role: "MECHANIC", commissionRate: 12, tenantId: tenant1.id } });
  await prisma.user.create({ data: { id: "user-att-1", email: "atendente@paiffer.com", password: passwordHash, name: "Ana Atendente", role: "ATTENDANT", tenantId: tenant1.id } });
  await prisma.user.create({ data: { id: "user-admin-2", email: "admin@demo.com", password: passwordHash, name: "Admin Demo", role: "ADMIN", tenantId: tenant2.id } });
  await prisma.user.create({ data: { id: "user-mech-3", email: "mecanico@demo.com", password: passwordHash, name: "Pedro Mecânico", role: "MECHANIC", commissionRate: 15, tenantId: tenant2.id } });

  // Clientes — NOMES IGUAIS em ambos os tenants (testa isolamento RLS)
  const c1 = await prisma.client.create({ data: { name: "Carlos Silva", document: "12345678901", docType: "CPF", phone: "(15) 99123-4567", tenantId: tenant1.id } });
  const c2 = await prisma.client.create({ data: { name: "Maria Oliveira", document: "98765432100", docType: "CPF", phone: "(15) 99876-5432", tenantId: tenant1.id } });
  const c3 = await prisma.client.create({ data: { name: "Pedro Santos", document: "11223344556", docType: "CPF", tenantId: tenant1.id } });
  await prisma.client.create({ data: { name: "Auto Peças Ltda", document: "12345678000155", docType: "CNPJ", active: false, tenantId: tenant1.id } });
  const c5 = await prisma.client.create({ data: { name: "Fernanda Costa", document: "55667788900", docType: "CPF", tenantId: tenant1.id } });
  const c6 = await prisma.client.create({ data: { name: "Roberto Almeida", document: "99887766500", docType: "CPF", tenantId: tenant1.id } });
  // Tenant 2 — mesmos nomes
  const c2_1 = await prisma.client.create({ data: { name: "Carlos Silva", document: "12345678901", docType: "CPF", phone: "(11) 91111-1111", tenantId: tenant2.id } });
  const c2_2 = await prisma.client.create({ data: { name: "Maria Oliveira", document: "98765432100", docType: "CPF", tenantId: tenant2.id } });

  // Veículos — MESMAS PLACAS em ambos os tenants (testa isolamento RLS)
  const v1 = await prisma.vehicle.create({ data: { plate: "ABC1D23", brand: "Peugeot", model: "208 Active", year: 2022, mileage: 35000, clientId: c1.id, tenantId: tenant1.id } });
  const v2 = await prisma.vehicle.create({ data: { plate: "XYZ9K87", brand: "Peugeot", model: "3008 GT", year: 2021, mileage: 52000, clientId: c2.id, tenantId: tenant1.id } });
  const v3 = await prisma.vehicle.create({ data: { plate: "DEF-5678", brand: "Volkswagen", model: "Golf TSI", year: 2020, mileage: 48000, clientId: c3.id, tenantId: tenant1.id } });
  const v4 = await prisma.vehicle.create({ data: { plate: "GHI2J45", brand: "Fiat", model: "Argo Drive", year: 2023, mileage: 15000, clientId: c5.id, tenantId: tenant1.id } });
  const v5 = await prisma.vehicle.create({ data: { plate: "JKL4G56", brand: "Toyota", model: "Corolla XEi", year: 2019, mileage: 72000, oilReminderEnabled: false, clientId: c6.id, tenantId: tenant1.id } });
  await prisma.vehicle.create({ data: { plate: "MNO-3456", brand: "Chevrolet", model: "Onix Plus", year: 2022, mileage: 28000, clientId: c1.id, tenantId: tenant1.id } });
  // Tenant 2 — mesmas placas
  const v2_1 = await prisma.vehicle.create({ data: { plate: "ABC1D23", brand: "Honda", model: "Civic", year: 2023, mileage: 10000, clientId: c2_1.id, tenantId: tenant2.id } });
  await prisma.vehicle.create({ data: { plate: "XYZ9K87", brand: "Toyota", model: "Yaris", year: 2022, mileage: 20000, clientId: c2_2.id, tenantId: tenant2.id } });

  // Catálogo de Serviços
  const svcData = [
    { description: "Troca de Óleo", category: "Preventiva", estimatedTime: 30, defaultPrice: 150, commissionRate: 8, tenantId: tenant1.id },
    { description: "Alinhamento e Balanceamento", category: "Suspensão", estimatedTime: 60, defaultPrice: 180, tenantId: tenant1.id },
    { description: "Troca de Pastilhas de Freio", category: "Freios", estimatedTime: 45, defaultPrice: 250, commissionRate: 15, tenantId: tenant1.id },
    { description: "Revisão Completa", category: "Preventiva", estimatedTime: 180, defaultPrice: 500, commissionRate: 12, tenantId: tenant1.id },
    { description: "Troca de Correia Dentada", category: "Motor", estimatedTime: 120, defaultPrice: 800, tenantId: tenant1.id },
    { description: "Diagnóstico Eletrônico", category: "Elétrica", estimatedTime: 40, defaultPrice: 120, commissionRate: 20, tenantId: tenant1.id },
    { description: "Troca de Amortecedores", category: "Suspensão", estimatedTime: 90, defaultPrice: 450, tenantId: tenant1.id },
    { description: "Higienização de Ar Condicionado", category: "Conforto", estimatedTime: 30, defaultPrice: 100, commissionRate: 25, tenantId: tenant1.id },
  ];
  for (const s of svcData) await prisma.serviceCatalog.create({ data: s });
  await prisma.serviceCatalog.create({ data: { description: "Troca de Óleo", category: "Preventiva", estimatedTime: 30, defaultPrice: 120, tenantId: tenant2.id } });

  // Estoque
  const stockData = [
    { code: "OLE001", description: "Óleo Motor 5W30 1L", brand: "Total", unit: "UN", quantity: 24, minQuantity: 10, costPrice: 35, sellPrice: 55, avgCost: 35, supplier: "Distribuidora Total", tenantId: tenant1.id },
    { code: "FIL001", description: "Filtro de Óleo Peugeot", brand: "Mann", unit: "UN", quantity: 8, minQuantity: 3, costPrice: 28, sellPrice: 45, avgCost: 28, tenantId: tenant1.id },
    { code: "PAS001", description: "Pastilha de Freio Dianteira", brand: "Bosch", unit: "JG", quantity: 5, minQuantity: 2, costPrice: 120, sellPrice: 180, avgCost: 120, tenantId: tenant1.id },
    { code: "AMO001", description: "Amortecedor Dianteiro", brand: "Monroe", unit: "UN", quantity: 2, minQuantity: 2, costPrice: 250, sellPrice: 380, avgCost: 250, tenantId: tenant1.id },
    { code: "FIL002", description: "Filtro de Ar Condicionado", brand: "Wega", unit: "UN", quantity: 1, minQuantity: 3, costPrice: 35, sellPrice: 60, avgCost: 35, tenantId: tenant1.id },
  ];
  const stockItems: Record<string, string> = {};
  for (const item of stockData) { const c = await prisma.stockItem.create({ data: item }); stockItems[item.code] = c.id; }
  await prisma.stockItem.create({ data: { code: "OLE001", description: "Óleo Motor 5W30 1L", brand: "Castrol", unit: "UN", quantity: 10, minQuantity: 5, costPrice: 40, sellPrice: 60, avgCost: 40, tenantId: tenant2.id } });

  // Ordens de Serviço — Tenant 1
  const orders: { number: number; status: OrderStatus; mileage: number; clientId: string; vehicleId: string; totalAmount: number; cancelReason?: string }[] = [
    { number: 1, status: "DELIVERED", mileage: 34500, clientId: c1.id, vehicleId: v1.id, totalAmount: 330 },
    { number: 2, status: "DELIVERED", mileage: 51000, clientId: c2.id, vehicleId: v2.id, totalAmount: 680 },
    { number: 3, status: "COMPLETED", mileage: 47500, clientId: c3.id, vehicleId: v3.id, totalAmount: 450 },
    { number: 4, status: "IN_PROGRESS", mileage: 35200, clientId: c1.id, vehicleId: v1.id, totalAmount: 250 },
    { number: 5, status: "WAITING_APPROVAL", mileage: 52500, clientId: c2.id, vehicleId: v2.id, totalAmount: 1200 },
    { number: 6, status: "WAITING_PART", mileage: 14800, clientId: c5.id, vehicleId: v4.id, totalAmount: 380 },
    { number: 7, status: "CANCELLED", mileage: 71500, clientId: c6.id, vehicleId: v5.id, totalAmount: 500, cancelReason: "Cliente desistiu" },
    { number: 8, status: "COMPLETED", mileage: 15000, clientId: c5.id, vehicleId: v4.id, totalAmount: 150 },
    { number: 9, status: "IN_PROGRESS", mileage: 48200, clientId: c3.id, vehicleId: v3.id, totalAmount: 180 },
    { number: 10, status: "DELIVERED", mileage: 72000, clientId: c6.id, vehicleId: v5.id, totalAmount: 800 },
  ];
  for (const o of orders) {
    const order = await prisma.serviceOrder.create({ data: { ...o, tenantId: tenant1.id, createdById: "user-admin-1" } });
    const complaint = await prisma.complaint.create({ data: { number: 1, description: `Reclamação OS #${o.number}`, orderId: order.id } });
    const mechanicId = o.number % 2 === 0 ? mech2.id : mech1.id;
    await prisma.orderService.create({ data: { description: svcData[(o.number - 1) % svcData.length].description, price: o.totalAmount, mechanicId, commissionRate: svcData[(o.number - 1) % svcData.length].commissionRate || null, orderId: order.id, complaintId: complaint.id } });
    await prisma.statusHistory.create({ data: { toStatus: "WAITING_APPROVAL", userId: "user-admin-1", orderId: order.id } });
    if (o.status !== "WAITING_APPROVAL") await prisma.statusHistory.create({ data: { fromStatus: "WAITING_APPROVAL", toStatus: o.status, userId: "user-admin-1", orderId: order.id } });
  }
  // Tenant 2 — OS com mesmo número
  const order2 = await prisma.serviceOrder.create({ data: { number: 1, status: "IN_PROGRESS", mileage: 10000, totalAmount: 200, clientId: c2_1.id, vehicleId: v2_1.id, tenantId: tenant2.id, createdById: "user-admin-2" } });
  await prisma.complaint.create({ data: { number: 1, description: "Troca de óleo", orderId: order2.id } });

  // Timer Logs
  const servicesWithMechanic = await prisma.orderService.findMany({ where: { order: { tenantId: tenant1.id, status: { in: ["IN_PROGRESS", "COMPLETED", "DELIVERED"] } }, mechanicId: { not: null } }, take: 5 });
  for (const svc of servicesWithMechanic) {
    const startedAt = new Date("2026-05-20T08:00:00Z");
    const finishedAt = new Date("2026-05-20T09:30:00Z");
    const totalSeconds = Math.floor((finishedAt.getTime() - startedAt.getTime()) / 1000);
    await prisma.timerLog.create({ data: { startedAt, finishedAt, totalSeconds, orderServiceId: svc.id, userId: svc.mechanicId! } });
    await prisma.orderService.update({ where: { id: svc.id }, data: { timeMinutes: Math.floor(totalSeconds / 60) } });
  }

  // Comissões
  const deliveredServices = await prisma.orderService.findMany({ where: { mechanicId: mech1.id, order: { tenantId: tenant1.id, status: { in: ["COMPLETED", "DELIVERED"] } } }, take: 3 });
  if (deliveredServices.length > 0) {
    const items = deliveredServices.map(s => ({ orderServiceId: s.id, baseValue: s.price, commissionValue: Math.round(s.price * (s.commissionRate ?? 10)) / 100 }));
    await prisma.commission.create({ data: { mechanicId: mech1.id, tenantId: tenant1.id, startDate: new Date("2026-04-01"), endDate: new Date("2026-04-30"), commissionRate: 10, totalBase: items.reduce((s, i) => s + i.baseValue, 0), totalCommission: items.reduce((s, i) => s + i.commissionValue, 0), status: "PAID", paidAt: new Date("2026-05-05"), paidById: "user-admin-1", approvedAt: new Date("2026-05-03"), approvedById: "user-admin-1", items: { create: items } } });
  }
  await prisma.commission.create({ data: { mechanicId: mech1.id, tenantId: tenant1.id, startDate: new Date("2026-05-16"), endDate: new Date("2026-05-31"), commissionRate: 10, totalBase: 0, totalCommission: 0, status: "PENDING" } });

  // Movimentações de Estoque
  await prisma.stockMovement.create({ data: { type: "IN", quantity: 24, reason: "Compra inicial", supplier: "Distribuidora Total", unitCost: 35, balanceBefore: 0, balanceAfter: 24, stockItemId: stockItems["OLE001"] } });
  await prisma.stockMovement.create({ data: { type: "OUT", quantity: 4, reason: "OS #1", balanceBefore: 24, balanceAfter: 20, stockItemId: stockItems["OLE001"] } });

  // Fiscal Config
  await prisma.fiscalConfig.create({ data: { tenantId: tenant1.id, enabled: true, environment: "homologation", cnpj: "12345678000199", inscricaoEstadual: "123456789", inscricaoMunicipal: "987654", razaoSocial: "Paiffer Bosch Car Service Peugeot Ltda", cityCode: "3552205" } });

  console.log("✅ Seed concluído — 2 tenants com dados sobrepostos para validação RLS!");
  console.log("   Tenant 1: tenant-paiffer (admin@paiffer.com / password123)");
  console.log("   Tenant 2: tenant-demo (admin@demo.com / password123)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
