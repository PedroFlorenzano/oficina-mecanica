import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/infrastructure/database/prisma";
import { RegisterTenant } from "@/application/use-cases/tenants/RegisterTenant";
import { handleError } from "@/lib/api-handler";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const useCase = new RegisterTenant(prismaAdmin);
    const result = await useCase.execute(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
