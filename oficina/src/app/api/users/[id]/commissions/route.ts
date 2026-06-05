import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import { withTenant } from "@/infrastructure/database/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: targetUserId } = await params;
    const tenantId = session.user.tenantId;
    const prisma = withTenant(tenantId);
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
    }

    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, tenantId },
      select: { id: true, name: true, email: true, role: true, commissionRate: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const where: Record<string, unknown> = { mechanicId: targetUserId, tenantId };
    if (startDate) where.startDate = { ...(where.startDate || {}), gte: new Date(startDate) };
    if (endDate) where.endDate = { ...(where.endDate || {}), lte: new Date(endDate + "T23:59:59.999Z") };

    const commissions = await prisma.commission.findMany({
      where,
      include: {
        items: {
          include: {
            orderService: {
              include: {
                order: {
                  select: {
                    id: true,
                    number: true,
                    client: { select: { name: true } },
                    vehicle: { select: { plate: true, model: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Summary
    const totalPaid = commissions
      .filter(c => c.status === "PAID")
      .reduce((s, c) => s + c.totalCommission, 0);
    const totalApproved = commissions
      .filter(c => c.status === "APPROVED")
      .reduce((s, c) => s + c.totalCommission, 0);
    const totalPending = commissions
      .filter(c => c.status === "PENDING")
      .reduce((s, c) => s + c.totalCommission, 0);
    const totalBase = commissions
      .filter(c => c.status !== "CANCELLED")
      .reduce((s, c) => s + c.totalBase, 0);

    return NextResponse.json({
      user: targetUser,
      summary: { totalPaid, totalApproved, totalPending, totalBase },
      commissions,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}
