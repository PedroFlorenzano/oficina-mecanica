import { IVehicleRepository } from "@/domain/repositories/IVehicleRepository";
import { IServiceOrderRepository } from "@/domain/repositories/IServiceOrderRepository";
import { NotFoundError } from "@/domain/errors/DomainError";

export interface OilChangeAlert {
  dueAt: number;              // km prevista para próxima troca
  lastChangeMileage: number;  // km da última troca registrada
  currentMileage: number;     // km atual do veículo
  overdue: boolean;           // true se já ultrapassou o limite
}

export class CheckOilChangeReminder {
  private static readonly ALERT_WINDOW = 4000;   // km para começar a alertar
  private static readonly CHANGE_INTERVAL = 10000; // km do intervalo padrão

  constructor(
    private vehicleRepo: IVehicleRepository,
    private orderRepo: IServiceOrderRepository
  ) {}

  async execute(vehicleId: string, tenantId: string): Promise<OilChangeAlert | null> {
    const vehicle = await this.vehicleRepo.findById(vehicleId);
    if (!vehicle || vehicle.tenantId !== tenantId) {
      throw new NotFoundError("Veículo não encontrado");
    }

    // Se o lembrete estiver desativado para este veículo, retornar null
    if (vehicle.oilReminderEnabled === false) {
      return null;
    }

    const oilOrders = await this.orderRepo.findOilChangeOrders(vehicleId, tenantId);
    if (oilOrders.length === 0) return null;

    // Mais recente primeiro
    const lastChange = oilOrders.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    const currentMileage = vehicle.mileage;
    const dueAt = lastChange.mileage + CheckOilChangeReminder.CHANGE_INTERVAL;

    if (currentMileage < lastChange.mileage + CheckOilChangeReminder.ALERT_WINDOW) {
      return null;
    }

    return {
      dueAt,
      lastChangeMileage: lastChange.mileage,
      currentMileage,
      overdue: currentMileage >= dueAt,
    };
  }
}
