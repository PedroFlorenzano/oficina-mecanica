import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/infrastructure/database/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: targetUserId } = await params;
    const tenantId = session.user.tenantId;

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    // Verify the target user belongs to the same tenant
    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, tenantId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    // Fetch all OrderServices where this user has TimerLog entries,
    // grouped by service — join through OrderService -> ServiceOrder for tenant isolation
    const timerLogs = await prisma.timerLog.findMany({
      where: {
        userId: targetUserId,
        orderService: {
          order: { tenantId },
        },
      },
      include: {
        orderService: {
          include: {
            order: {
              select: {
                id: true,
                number: true,
                status: true,
                createdAt: true,
                client: { select: { name: true } },
                vehicle: { select: { plate: true, brand: true, model: true } },
              },
            },
            service: { select: { estimatedTime: true } },
          },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    // Group by orderServiceId and aggregate
    const serviceMap = new Map<string, {
      orderServiceId: string;
      orderId: string;
      orderNumber: number;
      orderStatus: string;
      orderCreatedAt: Date;
      clientName: string;
      vehiclePlate: string;
      vehicleInfo: string;
      serviceDescription: string;
      estimatedMinutes: number | null;
      appointedSeconds: number;
    }>();

    for (const log of timerLogs) {
      const os = log.orderService;
      const existing = serviceMap.get(os.id);

      // Only count finished sessions toward appointed time
      const addSeconds = log.finishedAt !== null ? log.totalSeconds : 0;

      if (existing) {
        existing.appointedSeconds += addSeconds;
      } else {
        serviceMap.set(os.id, {
          orderServiceId: os.id,
          orderId: os.order.id,
          orderNumber: os.order.number,
          orderStatus: os.order.status,
          orderCreatedAt: os.order.createdAt,
          clientName: os.order.client.name,
          vehiclePlate: os.order.vehicle.plate,
          vehicleInfo: `${os.order.vehicle.brand} ${os.order.vehicle.model}`,
          serviceDescription: os.description,
          estimatedMinutes: os.service?.estimatedTime ?? null,
          appointedSeconds: addSeconds,
        });
      }
    }

    const services = Array.from(serviceMap.values())
      .sort((a, b) => b.orderCreatedAt.getTime() - a.orderCreatedAt.getTime());

    return NextResponse.json({ user: targetUser, services });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
