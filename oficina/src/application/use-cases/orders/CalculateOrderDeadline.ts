import { prisma } from "@/infrastructure/database/prisma";
import { WorkDayCalculator } from "@/domain/services/WorkDayCalculator";
import { NotFoundError } from "@/domain/errors/DomainError";

export interface DeadlineBreakdown {
  serviceDays: number;
  totalServiceMinutes: number;
  partsDays: number;
  criticalPart: string | null; // descrição da peça que determina o prazo
  totalDays: number;
  reason: "services" | "parts" | "both";
  estimatedDelivery: Date;
  workMinutesPerDay: number;
  warnings: string[]; // serviços sem tempo estimado, etc.
}

export class CalculateOrderDeadline {
  async execute(orderId: string, tenantId: string): Promise<DeadlineBreakdown> {
    // 1. Buscar OS completa com serviços, peças e seus itens de estoque/fornecedores
    const order = await prisma.serviceOrder.findFirst({
      where: { id: orderId, tenantId },
      include: {
        services: {
          include: {
            service: { select: { estimatedTime: true, description: true } },
          },
        },
        parts: {
          include: {
            stockItem: {
              select: {
                id: true,
                quantity: true,
                leadTimeDays: true,
                supplierId: true,
                supplierRef: { select: { defaultLeadTimeDays: true, name: true } },
              },
            },
          },
        },
        complaints: {
          include: {
            services: {
              include: {
                service: { select: { estimatedTime: true, description: true } },
              },
            },
            parts: {
              include: {
                stockItem: {
                  select: {
                    id: true,
                    quantity: true,
                    leadTimeDays: true,
                    supplierId: true,
                    supplierRef: { select: { defaultLeadTimeDays: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) throw new NotFoundError("Ordem de serviço não encontrada");

    // 2. Buscar ScheduleConfig do tenant (com holidays)
    const scheduleConfig = await prisma.scheduleConfig.findUnique({
      where: { tenantId },
      include: { holidays: true },
    });

    // Default se não configurado
    const config = scheduleConfig || {
      workDays: "[1,2,3,4,5,6]",
      startTime: "08:00",
      endTime: "18:00",
      lunchStart: "12:00",
      lunchEnd: "13:00",
      defaultPartLeadDays: 5,
      mechanicCount: 2,
    };

    const holidays = (scheduleConfig?.holidays || []).map((h) => ({
      date: h.date,
      recurring: h.recurring,
    }));

    const calculator = WorkDayCalculator.fromConfig(config, holidays);
    const workMinutesPerDay = calculator.getWorkMinutesPerDay();
    const defaultPartLeadDays = (scheduleConfig as { defaultPartLeadDays?: number })?.defaultPartLeadDays ?? 5;

    // 3. Calcular tempo total dos serviços
    const warnings: string[] = [];
    let totalServiceMinutes = 0;

    // Coletar todos os serviços (diretos + dentro de reclamações)
    const allServices = [
      ...order.services,
      ...order.complaints.flatMap((c) => c.services),
    ];

    for (const svc of allServices) {
      if (svc.timeMinutes && svc.timeMinutes > 0) {
        // Tempo real do cronômetro tem prioridade
        totalServiceMinutes += svc.timeMinutes;
      } else if (svc.service?.estimatedTime) {
        // Tempo estimado do catálogo
        totalServiceMinutes += svc.service.estimatedTime;
      } else {
        // Sem dados — buscar média histórica
        const avgTime = await this.getAverageServiceTime(
          svc.serviceId ?? null,
          svc.description,
          tenantId
        );
        if (avgTime) {
          totalServiceMinutes += avgTime;
        } else {
          warnings.push(`Serviço "${svc.description}" sem tempo estimado`);
        }
      }
    }

    // Paralelismo: dividir tempo por número de mecânicos simultâneos
    const mechanicCount = (scheduleConfig as { mechanicCount?: number })?.mechanicCount ?? 2;
    const effectiveServiceMinutes = mechanicCount > 1
      ? Math.ceil(totalServiceMinutes / mechanicCount)
      : totalServiceMinutes;

    const serviceDays = calculator.minutesToWorkDays(effectiveServiceMinutes);

    // 4. Calcular prazo das peças
    let partsDays = 0;
    let criticalPart: string | null = null;

    // Coletar todas as peças (diretas + dentro de reclamações)
    const allParts = [
      ...order.parts,
      ...order.complaints.flatMap((c) => c.parts),
    ];

    for (const part of allParts) {
      if (!part.stockItem) {
        // Peça avulsa sem cadastro de estoque — usa default
        const lead = defaultPartLeadDays;
        if (lead > partsDays) {
          partsDays = lead;
          criticalPart = `${part.description} (sem fornecedor, ${lead}d padrão)`;
        }
        continue;
      }

      // Verificar se tem estoque suficiente
      if (part.stockItem.quantity >= part.quantity) {
        // Em estoque — 0 dias
        continue;
      }

      // Sem estoque suficiente — calcular prazo
      let leadDays: number;
      let supplierName = "desconhecido";

      if (part.stockItem.leadTimeDays != null) {
        // Override no item
        leadDays = part.stockItem.leadTimeDays;
        supplierName = part.stockItem.supplierRef?.name || "item";
      } else if (part.stockItem.supplierRef) {
        // Prazo padrão do fornecedor
        leadDays = part.stockItem.supplierRef.defaultLeadTimeDays;
        supplierName = part.stockItem.supplierRef.name;
      } else {
        // Fallback global
        leadDays = defaultPartLeadDays;
      }

      if (leadDays > partsDays) {
        partsDays = leadDays;
        criticalPart = `${part.description} (${supplierName}, ${leadDays}d)`;
      }
    }

    // 5. Resultado final
    const totalDays = Math.max(serviceDays, partsDays, 1); // mínimo 1 dia (RN-01)
    const reason: "services" | "parts" | "both" =
      serviceDays > partsDays ? "services" : partsDays > serviceDays ? "parts" : "both";

    const now = new Date();
    const estimatedDelivery = calculator.addWorkDays(now, totalDays);

    // 6. Persistir na OS
    await prisma.serviceOrder.update({
      where: { id: orderId },
      data: {
        estimatedDelivery,
        estimatedDaysTotal: totalDays,
        estimatedDaysReason: reason,
      },
    });

    return {
      serviceDays,
      totalServiceMinutes,
      partsDays,
      criticalPart,
      totalDays,
      reason,
      estimatedDelivery,
      workMinutesPerDay,
      warnings,
    };
  }

  /**
   * Busca tempo médio histórico para um tipo de serviço naquele tenant.
   * Prioridade: serviceId (catálogo) > description (texto livre).
   * Considera apenas OSs finalizadas (COMPLETED/DELIVERED) para dados confiáveis.
   */
  private async getAverageServiceTime(
    serviceId: string | null,
    serviceDescription: string,
    tenantId: string
  ): Promise<number | null> {
    // 1. Buscar por serviceId (mais preciso — mesmo serviço do catálogo)
    if (serviceId) {
      const result = await prisma.orderService.aggregate({
        where: {
          serviceId,
          timeMinutes: { not: null, gt: 0 },
          order: { tenantId, status: { in: ["COMPLETED", "DELIVERED"] } },
        },
        _avg: { timeMinutes: true },
        _count: { timeMinutes: true },
      });

      if (result._count.timeMinutes >= 2) {
        return Math.round(result._avg.timeMinutes ?? 0);
      }
    }

    // 2. Fallback: buscar por descrição similar
    const result = await prisma.orderService.aggregate({
      where: {
        description: { contains: serviceDescription, mode: "insensitive" },
        timeMinutes: { not: null, gt: 0 },
        order: { tenantId, status: { in: ["COMPLETED", "DELIVERED"] } },
      },
      _avg: { timeMinutes: true },
      _count: { timeMinutes: true },
    });

    if (result._count.timeMinutes >= 2) {
      return Math.round(result._avg.timeMinutes ?? 0);
    }

    return null;
  }
}
