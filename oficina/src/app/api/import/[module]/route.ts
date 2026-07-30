import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import { ImportClients } from "@/application/use-cases/import/ImportClients";
import { ImportVehicles } from "@/application/use-cases/import/ImportVehicles";
import { ImportStock } from "@/application/use-cases/import/ImportStock";
import { ImportServices } from "@/application/use-cases/import/ImportServices";
import { ImportOrders } from "@/application/use-cases/import/ImportOrders";
import { ImportInvoices } from "@/application/use-cases/import/ImportInvoices";
import { ImportFinancial } from "@/application/use-cases/import/ImportFinancial";
import { ImportProductivity } from "@/application/use-cases/import/ImportProductivity";

const VALID_MODULES = ["clients", "vehicles", "stock", "services", "orders", "invoices", "financial", "productivity"] as const;
type ImportModule = (typeof VALID_MODULES)[number];

// Vercel: importação pode demorar com muitos registros
export const maxDuration = 300; // 5 minutos

/**
 * POST /api/import/[module]
 * Upload de arquivo XLS/XLSX/CSV e importação dos dados.
 *
 * Query params:
 * - mode: "import" (default) | "preview"
 * - duplicates: "skip" (default) | "update"
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ module: string }> }
) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;

    // Only ADMIN can import
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Apenas administradores podem importar dados" },
        { status: 403 }
      );
    }

    const { module } = await params;
    if (!VALID_MODULES.includes(module as ImportModule)) {
      return NextResponse.json(
        { error: `Módulo inválido. Use: ${VALID_MODULES.join(", ")}` },
        { status: 400 }
      );
    }

    // Parse multipart form
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: "Arquivo é obrigatório" },
        { status: 400 }
      );
    }

    // Validate file type
    const ext = file.name.toLowerCase().split(".").pop();
    if (!["xls", "xlsx", "csv"].includes(ext || "")) {
      return NextResponse.json(
        { error: "Formato inválido. Envie um arquivo .xls, .xlsx ou .csv" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Arquivo muito grande (máximo 10MB)" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mode = request.nextUrl.searchParams.get("mode") || "import";
    const skipDuplicates =
      request.nextUrl.searchParams.get("duplicates") !== "update";

    const container = createContainer(tenantId);

    // Preview mode - just parse and return mapped data
    if (mode === "preview") {
      const preview = await getPreview(
        module as ImportModule,
        buffer,
        file.name,
        container
      );
      return NextResponse.json(preview);
    }

    // Import mode
    const result = await executeImport(
      module as ImportModule,
      buffer,
      file.name,
      tenantId,
      skipDuplicates,
      container,
      session.user.userId
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleError(error);
  }
}

async function getPreview(
  module: ImportModule,
  buffer: Buffer,
  filename: string,
  container: ReturnType<typeof createContainer>
) {
  switch (module) {
    case "clients": {
      const uc = new ImportClients(container.clientRepository);
      return uc.preview(buffer, filename);
    }
    case "vehicles": {
      const uc = new ImportVehicles(
        container.vehicleRepository,
        container.clientRepository
      );
      return uc.preview(buffer, filename);
    }
    case "stock": {
      const uc = new ImportStock(container.stockItemRepository);
      return uc.preview(buffer, filename);
    }
    case "services": {
      const uc = new ImportServices(container.serviceCatalogRepository);
      return uc.preview(buffer, filename);
    }
    case "orders": {
      const uc = new ImportOrders(
        container.orderRepository,
        container.clientRepository,
        container.vehicleRepository
      );
      return uc.preview(buffer, filename);
    }
    case "invoices": {
      const uc = new ImportInvoices();
      return uc.preview(buffer, filename);
    }
    case "financial": {
      const uc = new ImportFinancial();
      return uc.preview(buffer, filename);
    }
    case "productivity": {
      const uc = new ImportProductivity();
      return uc.preview(buffer, filename);
    }
  }
}

async function executeImport(
  module: ImportModule,
  buffer: Buffer,
  filename: string,
  tenantId: string,
  skipDuplicates: boolean,
  container: ReturnType<typeof createContainer>,
  userId?: string
) {
  switch (module) {
    case "clients": {
      const uc = new ImportClients(container.clientRepository);
      return uc.execute({ buffer, filename, tenantId, skipDuplicates });
    }
    case "vehicles": {
      const uc = new ImportVehicles(
        container.vehicleRepository,
        container.clientRepository
      );
      return uc.execute({ buffer, filename, tenantId, skipDuplicates });
    }
    case "stock": {
      const uc = new ImportStock(container.stockItemRepository);
      return uc.execute({ buffer, filename, tenantId, skipDuplicates });
    }
    case "services": {
      const uc = new ImportServices(container.serviceCatalogRepository);
      return uc.execute({ buffer, filename, tenantId, skipDuplicates });
    }
    case "orders": {
      const uc = new ImportOrders(
        container.orderRepository,
        container.clientRepository,
        container.vehicleRepository
      );
      return uc.execute({ buffer, filename, tenantId, userId: userId || "", skipDuplicates });
    }
    case "invoices": {
      const uc = new ImportInvoices();
      return uc.execute({ buffer, filename, tenantId, skipDuplicates });
    }
    case "financial": {
      const uc = new ImportFinancial();
      return uc.execute({ buffer, filename, tenantId });
    }
    case "productivity": {
      const uc = new ImportProductivity();
      return uc.execute({ buffer, filename, tenantId });
    }
  }
}
