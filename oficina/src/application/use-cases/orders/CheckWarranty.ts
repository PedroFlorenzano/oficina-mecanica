import { prisma } from "@/infrastructure/database/prisma";

export interface WarrantyAlert {
  serviceDescription: string;
  previousOrderNumber: number;
  previousOrderDate: string;
  warrantyDays: number;
  daysRemaining: number;
}

export async function checkWarranty(vehicleId: string, tenantId: string): Promise<WarrantyAlert[]> {
  // Buscar todas OS concluídas/entregues deste veículo que usaram serviços com garantia
  const orders = await prisma.serviceOrder.findMany({
    where: {
      vehicleId,
      tenantId,
      status: { in: ["COMPLETED", "DELIVERED"] },
    },
    include: {
      services: {
        where: { serviceId: { not: null } },
        include: { service: { select: { warrantyDays: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const alerts: WarrantyAlert[] = [];

  for (const order of orders) {
    for (const svc of order.services) {
      const warrantyDays = svc.service?.warrantyDays;
      if (!warrantyDays) continue;

      const expiresAt = new Date(order.createdAt);
      expiresAt.setDate(expiresAt.getDate() + warrantyDays);

      if (now <= expiresAt) {
        const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        alerts.push({
          serviceDescription: svc.description,
          previousOrderNumber: order.number,
          previousOrderDate: order.createdAt.toISOString(),
          warrantyDays,
          daysRemaining,
        });
      }
    }
  }

  return alerts;
}
