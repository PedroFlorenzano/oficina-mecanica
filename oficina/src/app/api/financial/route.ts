import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { CreateFinancialEntry } from "@/application/use-cases/financial/CreateFinancialEntry";
import { ListFinancialEntries } from "@/application/use-cases/financial/ListFinancialEntries";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acesso restrito a administradores" },
        { status: 403 }
      );
    }

    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    const { searchParams } = new URL(request.url);

    const useCase = new ListFinancialEntries(container.financialEntryRepository);
    const entries = await useCase.execute(
      {
        status: (searchParams.get("status") as "PENDING" | "OVERDUE" | "PAID" | "ALL") || "ALL",
        category: searchParams.get("category") || undefined,
        startDate: searchParams.get("startDate") || undefined,
        endDate: searchParams.get("endDate") || undefined,
        supplier: searchParams.get("supplier") || undefined,
      },
      tenantId
    );

    return NextResponse.json(entries);
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acesso restrito a administradores" },
        { status: 403 }
      );
    }

    const tenantId = session.user.tenantId;
    const container = createContainer(tenantId);
    const body = await request.json();

    const useCase = new CreateFinancialEntry(container.financialEntryRepository);
    const entries = await useCase.execute(body, tenantId, session.user.userId);

    return NextResponse.json(entries, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
