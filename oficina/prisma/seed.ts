import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  // Create demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: "demo-tenant" },
    update: {},
    create: {
      id: "demo-tenant",
      name: "Paiffer Bosch Car Service Peugeot",
      cnpj: "12345678000199",
      phone: "(11) 3456-7890",
      address: "Rua das Oficinas, 100 - São Paulo/SP",
    },
  });

  // Create demo user
  await prisma.user.upsert({
    where: { id: "demo-user" },
    update: {},
    create: {
      id: "demo-user",
      email: "admin@paiffer.com",
      password: passwordHash,
      name: "Administrador",
      role: "ADMIN",
      tenantId: tenant.id,
    },
  });

  // Create demo mechanic
  await prisma.user.upsert({
    where: { id: "demo-mechanic" },
    update: { commissionRate: 10 },
    create: {
      id: "demo-mechanic",
      email: "mecanico@paiffer.com",
      password: passwordHash,
      name: "João Mecânico",
      role: "MECHANIC",
      commissionRate: 10,
      tenantId: tenant.id,
    },
  });

  // Create sample clients
  const client1 = await prisma.client.upsert({
    where: { document_tenantId: { document: "12345678901", tenantId: tenant.id } },
    update: {},
    create: {
      name: "Carlos Silva",
      document: "12345678901",
      docType: "CPF",
      phone: "(11) 99999-1234",
      email: "carlos@email.com",
      tenantId: tenant.id,
    },
  });

  const client2 = await prisma.client.upsert({
    where: { document_tenantId: { document: "98765432100", tenantId: tenant.id } },
    update: {},
    create: {
      name: "Maria Oliveira",
      document: "98765432100",
      docType: "CPF",
      phone: "(11) 98888-5678",
      email: "maria@email.com",
      tenantId: tenant.id,
    },
  });

  // Create vehicles
  await prisma.vehicle.upsert({
    where: { plate_tenantId: { plate: "ABC1D23", tenantId: tenant.id } },
    update: {},
    create: {
      plate: "ABC1D23",
      brand: "Peugeot",
      model: "208 Active",
      year: 2022,
      color: "Branco",
      mileage: 35000,
      clientId: client1.id,
      tenantId: tenant.id,
    },
  });

  await prisma.vehicle.upsert({
    where: { plate_tenantId: { plate: "XYZ9K87", tenantId: tenant.id } },
    update: {},
    create: {
      plate: "XYZ9K87",
      brand: "Peugeot",
      model: "3008 GT",
      year: 2021,
      color: "Preto",
      mileage: 52000,
      clientId: client2.id,
      tenantId: tenant.id,
    },
  });

  // Create service catalog
  const serviceData = [
    { description: "Troca de Óleo", category: "Manutenção Preventiva", estimatedTime: 30, defaultPrice: 150, tenantId: tenant.id },
    { description: "Alinhamento e Balanceamento", category: "Suspensão", estimatedTime: 60, defaultPrice: 180, tenantId: tenant.id },
    { description: "Troca de Pastilhas de Freio", category: "Freios", estimatedTime: 45, defaultPrice: 250, tenantId: tenant.id },
    { description: "Revisão Completa", category: "Manutenção Preventiva", estimatedTime: 180, defaultPrice: 500, tenantId: tenant.id },
    { description: "Troca de Correia Dentada", category: "Motor", estimatedTime: 120, defaultPrice: 800, tenantId: tenant.id },
  ];
  for (const s of serviceData) {
    const existing = await prisma.serviceCatalog.findFirst({ where: { description: s.description, tenantId: s.tenantId } });
    if (!existing) await prisma.serviceCatalog.create({ data: s });
  }

  // Create stock items
  const stockData = [
    { code: "OLE001", description: "Óleo Motor 5W30 Sintético 1L", brand: "Total", unit: "UN", quantity: 24, minQuantity: 10, costPrice: 35, sellPrice: 55, avgCost: 35, tenantId: tenant.id },
    { code: "FIL001", description: "Filtro de Óleo Peugeot 208/308", brand: "Mann", unit: "UN", quantity: 8, minQuantity: 3, costPrice: 28, sellPrice: 45, avgCost: 28, tenantId: tenant.id },
    { code: "PAS001", description: "Pastilha de Freio Dianteira Peugeot", brand: "Bosch", unit: "JG", quantity: 5, minQuantity: 2, costPrice: 120, sellPrice: 180, avgCost: 120, tenantId: tenant.id },
    { code: "COR001", description: "Correia Dentada Peugeot 1.6", brand: "Gates", unit: "UN", quantity: 3, minQuantity: 1, costPrice: 180, sellPrice: 280, avgCost: 180, tenantId: tenant.id },
  ];
  for (const item of stockData) {
    const existing = await prisma.stockItem.findFirst({ where: { code: item.code, tenantId: item.tenantId } });
    if (!existing) await prisma.stockItem.create({ data: item });
  }

  // Create demo commissions with real items
  const existingCommission = await prisma.commission.findFirst({ where: { tenantId: tenant.id } });
  if (!existingCommission) {
    // Assign mechanic to services in completed orders
    const completedServices = await prisma.orderService.findMany({
      where: { order: { tenantId: tenant.id, status: { in: ["COMPLETED", "DELIVERED"] } } },
    });
    for (const svc of completedServices) {
      if (!svc.mechanicId) {
        await prisma.orderService.update({ where: { id: svc.id }, data: { mechanicId: "demo-mechanic" } });
      }
    }

    // Reload with mechanicId set
    const eligibleServices = await prisma.orderService.findMany({
      where: { mechanicId: "demo-mechanic", order: { tenantId: tenant.id, status: { in: ["COMPLETED", "DELIVERED"] } } },
    });

    if (eligibleServices.length > 0) {
      const rate = 10;
      const items = eligibleServices.map(s => ({
        orderServiceId: s.id,
        baseValue: s.price,
        commissionValue: Math.round(s.price * rate) / 100,
      }));
      const totalBase = items.reduce((sum, i) => sum + i.baseValue, 0);
      const totalCommission = items.reduce((sum, i) => sum + i.commissionValue, 0);

      await prisma.commission.create({
        data: {
          mechanicId: "demo-mechanic",
          tenantId: tenant.id,
          startDate: new Date("2026-05-01"),
          endDate: new Date("2026-05-31"),
          commissionRate: rate,
          totalBase,
          totalCommission,
          status: "PENDING",
          items: { create: items },
        },
      });
    }
  }

  console.log("✅ Seed concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
