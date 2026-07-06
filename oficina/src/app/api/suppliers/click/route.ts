import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/infrastructure/database/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const userId = session.user.userId;

    const body = await request.json();
    const { supplierId, searchQuery, productUrl, orderId } = body;

    if (!supplierId || !searchQuery || !productUrl) {
      return NextResponse.json(
        { error: "supplierId, searchQuery e productUrl são obrigatórios" },
        { status: 400 }
      );
    }

    await prisma.supplierClick.create({
      data: {
        tenantId,
        supplierId,
        userId,
        searchQuery,
        productUrl,
        orderId: orderId || null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
