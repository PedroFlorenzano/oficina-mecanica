import { NextResponse } from "next/server";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import { withTenant } from "@/infrastructure/database/prisma";

export async function GET() {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const prisma = withTenant(tenantId);

    const [
      totalClients,
      totalVehicles,
      openOrders,
      totalStock,
      recentOrders,
    ] = await Promise.all([
      // Total active clients
      prisma.client.count({ where: { tenantId, active: true } }),

      // Total vehicles
      prisma.vehicle.count({ where: { tenantId } }),

      // Open OS (not terminal)
      prisma.serviceOrder.count({
        where: {
          tenantId,
          status: { notIn: ["COMPLETED", "DELIVERED", "CANCELLED"] },
        },
      }),

      // Total stock items
      prisma.stockItem.count({ where: { tenantId, active: true } }),

      // Last 8 orders
      prisma.serviceOrder.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          number: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          client: { select: { name: true } },
          vehicle: { select: { plate: true, brand: true, model: true } },
        },
      }),
    ]);

    return NextResponse.json({
      totalClients,
      totalVehicles,
      openOrders,
      totalStock,
      recentOrders,
    });
  } catch (error) {
    return handleError(error);
  }
}
