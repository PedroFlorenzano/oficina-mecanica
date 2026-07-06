import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { CreateSupplier } from "@/application/use-cases/suppliers/CreateSupplier";
import { ListSuppliers } from "@/application/use-cases/suppliers/ListSuppliers";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);

    const useCase = new ListSuppliers(container.supplierRepository);
    const suppliers = await useCase.execute(tenantId);

    return NextResponse.json(suppliers);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);

    const body = await request.json();
    const useCase = new CreateSupplier(container.supplierRepository);
    const supplier = await useCase.execute(body, tenantId);

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
