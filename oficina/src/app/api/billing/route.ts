import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prismaAdmin } from "@/infrastructure/database/prisma";
import { handleError } from "@/lib/api-handler";

// GET /api/billing — current tenant billing status
export async function GET() {
  try {
    const session = await requireAuth();
    const tenant = await prismaAdmin.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { plan: true, planExpiresAt: true, billingStatus: true, name: true },
    });

    return NextResponse.json(tenant);
  } catch (error) {
    return handleError(error);
  }
}
