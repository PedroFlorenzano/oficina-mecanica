import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { UpdateSupplier } from "@/application/use-cases/suppliers/UpdateSupplier";
import { DeleteSupplier } from "@/application/use-cases/suppliers/DeleteSupplier";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    const { id } = await params;

    const supplier = await container.supplierRepository.findById(id);
    if (!supplier || supplier.tenantId !== tenantId) {
      return NextResponse.json({ error: "Fornecedor não encontrado" }, { status: 404 });
    }

    // Incluir searchConfigs
    const { prisma } = await import("@/infrastructure/database/prisma");
    const searchConfigs = await prisma.supplierSearchConfig.findMany({
      where: { supplierId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ ...supplier, searchConfigs });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    const { id } = await params;

    const body = await request.json();
    const { searchConfigs, ...supplierData } = body;

    const useCase = new UpdateSupplier(container.supplierRepository);
    const supplier = await useCase.execute(id, supplierData, tenantId);

    // Atualizar searchConfigs se fornecido
    if (searchConfigs !== undefined) {
      const { prisma } = await import("@/infrastructure/database/prisma");
      // Deletar existentes e recriar
      await prisma.supplierSearchConfig.deleteMany({ where: { supplierId: id } });
      if (Array.isArray(searchConfigs) && searchConfigs.length > 0) {
        await prisma.supplierSearchConfig.createMany({
          data: searchConfigs
            .filter((sc: { searchUrlTemplate?: string }) => sc.searchUrlTemplate?.trim())
            .map((sc: { searchUrlTemplate: string; active?: boolean }) => ({
              supplierId: id,
              searchUrlTemplate: sc.searchUrlTemplate.trim(),
              active: sc.active ?? true,
            })),
        });
      }
    }

    return NextResponse.json(supplier);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    const { id } = await params;

    const useCase = new DeleteSupplier(container.supplierRepository);
    await useCase.execute(id, tenantId);

    return NextResponse.json({ message: "Fornecedor excluído" });
  } catch (error) {
    return handleError(error);
  }
}
