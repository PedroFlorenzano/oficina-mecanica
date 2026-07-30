import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { UpdateFinancialEntry, DeleteFinancialEntry } from "@/application/use-cases/financial/UpdateFinancialEntry";
import { PayFinancialEntry } from "@/application/use-cases/financial/PayFinancialEntry";
import { ProrrogateFinancialEntry } from "@/application/use-cases/financial/ProrrogateFinancialEntry";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acesso restrito a administradores" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    const body = await request.json();

    const useCase = new UpdateFinancialEntry(container.financialEntryRepository);
    const entry = await useCase.execute({ id, ...body }, tenantId);

    return NextResponse.json(entry);
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acesso restrito a administradores" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);

    const useCase = new DeleteFinancialEntry(container.financialEntryRepository);
    await useCase.execute(id, tenantId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error);
  }
}

// PATCH para ações: dar baixa ou prorrogar
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acesso restrito a administradores" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    const body = await request.json();

    if (body.action === "pay") {
      const useCase = new PayFinancialEntry(container.financialEntryRepository);
      const entry = await useCase.execute(
        { id, paidAt: body.paidAt, paidAmount: body.paidAmount },
        tenantId
      );
      return NextResponse.json(entry);
    }

    if (body.action === "prorrogate") {
      const useCase = new ProrrogateFinancialEntry(container.financialEntryRepository);
      const entry = await useCase.execute(
        { id, newDueDate: body.newDueDate },
        tenantId
      );
      return NextResponse.json(entry);
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    return handleError(error);
  }
}
