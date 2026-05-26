import { PrismaClient, OrderStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  // Tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: "demo-tenant" },
    update: {},
    create: {
      id: "demo-tenant",
      name: "Paiffer Bosch Car Service Peugeot",
      cnpj: "12345678000199",
      phone: "(15) 3456-7890",
      address: "Rua das Oficinas, 100 - Sorocaba/SP",
    },
  });

  // Users
  await prisma.user.upsert({
    where: { id: "demo-user" },
    update: {},
    create: { id: "demo-user", email: "admin@paiffer.com", password: passwordHash, name: "Administrador", role: "ADMIN", tenantId: tenant.id },
  });

  const mechanic1 = await prisma.user.upsert({
    where: { id: "demo-mechanic" },
    update: { commissionRate: 10 },
    create: { id: "demo-mechanic", email: "mecanico@paiffer.com", password: passwordHash, name: "João Mecânico", role: "MECHANIC", commissionRate: 10, tenantId: tenant.id },
  });

  const mechanic2 = await prisma.user.upsert({
    where: { id: "demo-mechanic-2" },
    update: { commissionRate: 12 },
    create: { id: "demo-mechanic-2", email: "carlos@paiffer.com", password: passwordHash, name: "Carlos Eletricista", role: "MECHANIC", commissionRate: 12, tenantId: tenant.id },
  });

  await prisma.user.upsert({
    where: { id: "demo-attendant" },
    update: {},
    create: { id: "demo-attendant", email: "atendente@paiffer.com", password: passwordHash, name: "Ana Atendente", role: "ATTENDANT", tenantId: tenant.id },
  });

  // Clients
  const client1 = await prisma.client.upsert({
    where: { document_tenantId: { document: "12345678901", tenantId: tenant.id } },
    update: {},
    create: { name: "Carlos Silva", document: "12345678901", docType: "CPF", phone: "(15) 99123-4567", email: "carlos@email.com", address: "Rua A, 100 - Sorocaba/SP", tenantId: tenant.id },
  });
  const client2 = await prisma.client.upsert({
    where: { document_tenantId: { document: "98765432100", tenantId: tenant.id } },
    update: {},
    create: { name: "Maria Oliveira", document: "98765432100", docType: "CPF", phone: "(15) 99876-5432", email: "maria@email.com", address: "Av. B, 200 - Sorocaba/SP", tenantId: tenant.id },
  });
  const client3 = await prisma.client.upsert({
    where: { document_tenantId: { document: "11223344556", tenantId: tenant.id } },
    update: {},
    create: { name: "Pedro Santos", document: "11223344556", docType: "CPF", phone: "(15) 99111-2233", tenantId: tenant.id },
  });
  const client4 = await prisma.client.upsert({
    where: { document_tenantId: { document: "12345678000155", tenantId: tenant.id } },
    update: {},
    create: { name: "Auto Peças Ltda", document: "12345678000155", docType: "CNPJ", phone: "(15) 3333-4444", active: false, tenantId: tenant.id },
  });
  const client5 = await prisma.client.upsert({
    where: { document_tenantId: { document: "55667788900", tenantId: tenant.id } },
    update: {},
    create: { name: "Fernanda Costa", document: "55667788900", docType: "CPF", phone: "(15) 99555-6677", email: "fernanda@email.com", tenantId: tenant.id },
  });
  const client6 = await prisma.client.upsert({
    where: { document_tenantId: { document: "99887766500", tenantId: tenant.id } },
    update: {},
    create: { name: "Roberto Almeida", document: "99887766500", docType: "CPF", phone: "(15) 99988-7766", tenantId: tenant.id },
  });

  // Vehicles
  const v1 = await prisma.vehicle.upsert({ where: { plate_tenantId: { plate: "ABC1D23", tenantId: tenant.id } }, update: {}, create: { plate: "ABC1D23", brand: "Peugeot", model: "208 Active", year: 2022, color: "Branco", mileage: 35000, clientId: client1.id, tenantId: tenant.id } });
  const v2 = await prisma.vehicle.upsert({ where: { plate_tenantId: { plate: "XYZ9K87", tenantId: tenant.id } }, update: {}, create: { plate: "XYZ9K87", brand: "Peugeot", model: "3008 GT", year: 2021, color: "Preto", mileage: 52000, clientId: client2.id, tenantId: tenant.id } });
  const v3 = await prisma.vehicle.upsert({ where: { plate_tenantId: { plate: "DEF-5678", tenantId: tenant.id } }, update: {}, create: { plate: "DEF-5678", brand: "Volkswagen", model: "Golf TSI", year: 2020, color: "Cinza", mileage: 48000, clientId: client3.id, tenantId: tenant.id } });
  const v4 = await prisma.vehicle.upsert({ where: { plate_tenantId: { plate: "GHI2J45", tenantId: tenant.id } }, update: {}, create: { plate: "GHI2J45", brand: "Fiat", model: "Argo Drive", year: 2023, color: "Vermelho", mileage: 15000, clientId: client5.id, tenantId: tenant.id } });
  const v5 = await prisma.vehicle.upsert({ where: { plate_tenantId: { plate: "JKL4G56", tenantId: tenant.id } }, update: {}, create: { plate: "JKL4G56", brand: "Toyota", model: "Corolla XEi", year: 2019, color: "Prata", mileage: 72000, oilReminderEnabled: false, clientId: client6.id, tenantId: tenant.id } });
  await prisma.vehicle.upsert({ where: { plate_tenantId: { plate: "MNO-3456", tenantId: tenant.id } }, update: {}, create: { plate: "MNO-3456", brand: "Chevrolet", model: "Onix Plus", year: 2022, color: "Azul", mileage: 28000, clientId: client1.id, tenantId: tenant.id } });

  // Service Catalog (com commissionRate em alguns)
  const svcData = [
    { description: "Troca de Óleo", category: "Manutenção Preventiva", estimatedTime: 30, defaultPrice: 150, commissionRate: 8, tenantId: tenant.id },
    { description: "Alinhamento e Balanceamento", category: "Suspensão", estimatedTime: 60, defaultPrice: 180, tenantId: tenant.id },
    { description: "Troca de Pastilhas de Freio", category: "Freios", estimatedTime: 45, defaultPrice: 250, commissionRate: 15, tenantId: tenant.id },
    { description: "Revisão Completa", category: "Manutenção Preventiva", estimatedTime: 180, defaultPrice: 500, commissionRate: 12, tenantId: tenant.id },
    { description: "Troca de Correia Dentada", category: "Motor", estimatedTime: 120, defaultPrice: 800, tenantId: tenant.id },
    { description: "Diagnóstico Eletrônico", category: "Elétrica", estimatedTime: 40, defaultPrice: 120, commissionRate: 20, tenantId: tenant.id },
    { description: "Troca de Amortecedores", category: "Suspensão", estimatedTime: 90, defaultPrice: 450, tenantId: tenant.id },
    { description: "Higienização de Ar Condicionado", category: "Conforto", estimatedTime: 30, defaultPrice: 100, commissionRate: 25, tenantId: tenant.id },
  ];
  for (const s of svcData) {
    const existing = await prisma.serviceCatalog.findFirst({ where: { description: s.description, tenantId: s.tenantId } });
    if (!existing) await prisma.serviceCatalog.create({ data: s });
    else if (s.commissionRate && !existing.commissionRate) {
      await prisma.serviceCatalog.update({ where: { id: existing.id }, data: { commissionRate: s.commissionRate } });
    }
  }

  // Stock Items
  const stockData = [
    { code: "OLE001", description: "Óleo Motor 5W30 Sintético 1L", brand: "Total", unit: "UN", quantity: 24, minQuantity: 10, costPrice: 35, sellPrice: 55, avgCost: 35, supplier: "Distribuidora Total", tenantId: tenant.id },
    { code: "FIL001", description: "Filtro de Óleo Peugeot 208/308", brand: "Mann", unit: "UN", quantity: 8, minQuantity: 3, costPrice: 28, sellPrice: 45, avgCost: 28, supplier: "Mann Filter Brasil", tenantId: tenant.id },
    { code: "PAS001", description: "Pastilha de Freio Dianteira Peugeot", brand: "Bosch", unit: "JG", quantity: 5, minQuantity: 2, costPrice: 120, sellPrice: 180, avgCost: 120, supplier: "Bosch Autopeças", tenantId: tenant.id },
    { code: "COR001", description: "Correia Dentada Peugeot 1.6", brand: "Gates", unit: "UN", quantity: 3, minQuantity: 1, costPrice: 180, sellPrice: 280, avgCost: 180, tenantId: tenant.id },
    { code: "AMO001", description: "Amortecedor Dianteiro Peugeot 208", brand: "Monroe", unit: "UN", quantity: 2, minQuantity: 2, costPrice: 250, sellPrice: 380, avgCost: 250, tenantId: tenant.id },
    { code: "VEL001", description: "Vela de Ignição NGK", brand: "NGK", unit: "UN", quantity: 12, minQuantity: 8, costPrice: 22, sellPrice: 38, avgCost: 22, tenantId: tenant.id },
    { code: "FLU001", description: "Fluido de Freio DOT4 500ml", brand: "Bosch", unit: "UN", quantity: 6, minQuantity: 4, costPrice: 25, sellPrice: 42, avgCost: 25, tenantId: tenant.id },
    { code: "FIL002", description: "Filtro de Ar Condicionado", brand: "Wega", unit: "UN", quantity: 1, minQuantity: 3, costPrice: 35, sellPrice: 60, avgCost: 35, tenantId: tenant.id },
  ];
  for (const item of stockData) {
    const existing = await prisma.stockItem.findFirst({ where: { code: item.code, tenantId: item.tenantId } });
    if (!existing) await prisma.stockItem.create({ data: item });
  }

  // Orders (10 com status variados)
  const existingOrders = await prisma.serviceOrder.count({ where: { tenantId: tenant.id } });
  if (existingOrders === 0) {
    const orders: { number: number; status: OrderStatus; mileage: number; clientId: string; vehicleId: string; totalAmount: number; cancelReason?: string }[] = [
      { number: 1, status: "DELIVERED", mileage: 34500, clientId: client1.id, vehicleId: v1.id, totalAmount: 330 },
      { number: 2, status: "DELIVERED", mileage: 51000, clientId: client2.id, vehicleId: v2.id, totalAmount: 680 },
      { number: 3, status: "COMPLETED", mileage: 47500, clientId: client3.id, vehicleId: v3.id, totalAmount: 450 },
      { number: 4, status: "IN_PROGRESS", mileage: 35200, clientId: client1.id, vehicleId: v1.id, totalAmount: 250 },
      { number: 5, status: "WAITING_APPROVAL", mileage: 52500, clientId: client2.id, vehicleId: v2.id, totalAmount: 1200 },
      { number: 6, status: "WAITING_PART", mileage: 14800, clientId: client5.id, vehicleId: v4.id, totalAmount: 380 },
      { number: 7, status: "CANCELLED", mileage: 71500, clientId: client6.id, vehicleId: v5.id, totalAmount: 500, cancelReason: "Cliente desistiu do serviço" },
      { number: 8, status: "COMPLETED", mileage: 15000, clientId: client5.id, vehicleId: v4.id, totalAmount: 150 },
      { number: 9, status: "IN_PROGRESS", mileage: 48200, clientId: client3.id, vehicleId: v3.id, totalAmount: 180 },
      { number: 10, status: "DELIVERED", mileage: 72000, clientId: client6.id, vehicleId: v5.id, totalAmount: 800 },
    ];

    for (const o of orders) {
      const order = await prisma.serviceOrder.create({
        data: { ...o, tenantId: tenant.id, createdById: "demo-user" },
      });

      // Add complaints + services
      const complaint = await prisma.complaint.create({
        data: { number: 1, description: `Reclamação OS #${o.number}`, orderId: order.id },
      });

      const mechanicId = o.number % 2 === 0 ? mechanic2.id : mechanic1.id;
      await prisma.orderService.create({
        data: {
          description: svcData[(o.number - 1) % svcData.length].description,
          price: o.totalAmount,
          mechanicId,
          commissionRate: svcData[(o.number - 1) % svcData.length].commissionRate || null,
          orderId: order.id,
          complaintId: complaint.id,
        },
      });

      // Status history
      await prisma.statusHistory.create({
        data: { fromStatus: null, toStatus: "WAITING_APPROVAL", userId: "demo-user", orderId: order.id },
      });
      if (o.status !== "WAITING_APPROVAL") {
        await prisma.statusHistory.create({
          data: { fromStatus: "WAITING_APPROVAL", toStatus: o.status, userId: "demo-user", orderId: order.id },
        });
      }
    }

    // Timer logs (cronômetros finalizados) para OS em andamento e concluídas
    const servicesWithMechanic = await prisma.orderService.findMany({
      where: { order: { tenantId: tenant.id, status: { in: ["IN_PROGRESS", "COMPLETED", "DELIVERED"] } }, mechanicId: { not: null } },
      take: 5,
    });

    for (const svc of servicesWithMechanic) {
      const startedAt = new Date("2026-05-20T08:00:00Z");
      const finishedAt = new Date("2026-05-20T09:30:00Z");
      const totalSeconds = Math.floor((finishedAt.getTime() - startedAt.getTime()) / 1000);

      await prisma.timerLog.create({
        data: {
          startedAt,
          finishedAt,
          totalSeconds,
          orderServiceId: svc.id,
          userId: svc.mechanicId!,
        },
      });

      await prisma.orderService.update({
        where: { id: svc.id },
        data: { timeMinutes: Math.floor(totalSeconds / 60) },
      });
    }
  }

  // Commissions (3 com status variados)
  const existingCommissions = await prisma.commission.count({ where: { tenantId: tenant.id } });
  if (existingCommissions === 0) {
    const deliveredServices1 = await prisma.orderService.findMany({
      where: { mechanicId: mechanic1.id, order: { tenantId: tenant.id, status: { in: ["COMPLETED", "DELIVERED"] } } },
      take: 3,
    });
    const deliveredServices2 = await prisma.orderService.findMany({
      where: { mechanicId: mechanic2.id, order: { tenantId: tenant.id, status: { in: ["COMPLETED", "DELIVERED"] } } },
      take: 2,
    });

    if (deliveredServices1.length > 0) {
      const rate = 10;
      const items = deliveredServices1.map(s => ({
        orderServiceId: s.id,
        baseValue: s.price,
        commissionValue: Math.round(s.price * (s.commissionRate ?? rate)) / 100,
      }));
      // PAID commission
      await prisma.commission.create({
        data: {
          mechanicId: mechanic1.id, tenantId: tenant.id,
          startDate: new Date("2026-04-01"), endDate: new Date("2026-04-30"),
          commissionRate: rate,
          totalBase: items.reduce((s, i) => s + i.baseValue, 0),
          totalCommission: items.reduce((s, i) => s + i.commissionValue, 0),
          status: "PAID", paidAt: new Date("2026-05-05"), paidById: "demo-user",
          approvedAt: new Date("2026-05-03"), approvedById: "demo-user",
          items: { create: items },
        },
      });
    }

    if (deliveredServices2.length > 0) {
      const rate = 12;
      const items = deliveredServices2.map(s => ({
        orderServiceId: s.id,
        baseValue: s.price,
        commissionValue: Math.round(s.price * (s.commissionRate ?? rate)) / 100,
      }));
      // APPROVED commission
      await prisma.commission.create({
        data: {
          mechanicId: mechanic2.id, tenantId: tenant.id,
          startDate: new Date("2026-05-01"), endDate: new Date("2026-05-15"),
          commissionRate: rate,
          totalBase: items.reduce((s, i) => s + i.baseValue, 0),
          totalCommission: items.reduce((s, i) => s + i.commissionValue, 0),
          status: "APPROVED", approvedAt: new Date("2026-05-20"), approvedById: "demo-user",
          items: { create: items },
        },
      });
    }

    // PENDING commission (sem items — período futuro)
    await prisma.commission.create({
      data: {
        mechanicId: mechanic1.id, tenantId: tenant.id,
        startDate: new Date("2026-05-16"), endDate: new Date("2026-05-31"),
        commissionRate: 10, totalBase: 0, totalCommission: 0, status: "PENDING",
      },
    });
  }

  // Stock movements
  const existingMovements = await prisma.stockMovement.count();
  if (existingMovements === 0) {
    const oleo = await prisma.stockItem.findFirst({ where: { code: "OLE001", tenantId: tenant.id } });
    const filtro = await prisma.stockItem.findFirst({ where: { code: "FIL001", tenantId: tenant.id } });
    if (oleo) {
      await prisma.stockMovement.create({ data: { type: "IN", quantity: 24, reason: "Compra inicial", supplier: "Distribuidora Total", unitCost: 35, balanceBefore: 0, balanceAfter: 24, stockItemId: oleo.id } });
      await prisma.stockMovement.create({ data: { type: "OUT", quantity: 4, reason: "OS #1 - Troca de óleo", balanceBefore: 24, balanceAfter: 20, stockItemId: oleo.id } });
    }
    if (filtro) {
      await prisma.stockMovement.create({ data: { type: "IN", quantity: 10, reason: "Compra", supplier: "Mann Filter Brasil", unitCost: 28, balanceBefore: 0, balanceAfter: 10, stockItemId: filtro.id } });
      await prisma.stockMovement.create({ data: { type: "OUT", quantity: 2, reason: "OS #1 e #2", balanceBefore: 10, balanceAfter: 8, stockItemId: filtro.id } });
    }
  }

  // Fiscal Config
  await prisma.fiscalConfig.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      enabled: true,
      environment: "homologation",
      cnpj: "12345678000199",
      inscricaoEstadual: "123456789",
      inscricaoMunicipal: "987654",
      razaoSocial: "Paiffer Bosch Car Service Peugeot Ltda",
      nfeSeries: 1,
      nfseSeries: 1,
      nextNfeNumber: 1,
      nextNfseNumber: 1,
      cityCode: "3552205",
    },
  });

  console.log("✅ Seed concluído com sucesso!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
