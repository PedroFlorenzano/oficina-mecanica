import { checkWarranty } from "../CheckWarranty";

// Mock prisma
jest.mock("@/infrastructure/database/prisma", () => ({
  prisma: {
    serviceOrder: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from "@/infrastructure/database/prisma";

const mockFindMany = prisma.serviceOrder.findMany as jest.Mock;

describe("CheckWarranty", () => {
  beforeEach(() => jest.clearAllMocks());

  it("retorna alerta quando serviço está em garantia", async () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    mockFindMany.mockResolvedValue([
      {
        number: 42,
        createdAt: tenDaysAgo,
        services: [
          { description: "Troca de óleo", service: { warrantyDays: 90 } },
        ],
      },
    ]);

    const alerts = await checkWarranty("vehicle-1", "tenant-1");

    expect(alerts).toHaveLength(1);
    expect(alerts[0].serviceDescription).toBe("Troca de óleo");
    expect(alerts[0].previousOrderNumber).toBe(42);
    expect(alerts[0].daysRemaining).toBeLessThanOrEqual(80);
    expect(alerts[0].daysRemaining).toBeGreaterThan(70);
  });

  it("não retorna alerta quando garantia expirou", async () => {
    const oneHundredDaysAgo = new Date();
    oneHundredDaysAgo.setDate(oneHundredDaysAgo.getDate() - 100);

    mockFindMany.mockResolvedValue([
      {
        number: 10,
        createdAt: oneHundredDaysAgo,
        services: [
          { description: "Freios", service: { warrantyDays: 90 } },
        ],
      },
    ]);

    const alerts = await checkWarranty("vehicle-1", "tenant-1");
    expect(alerts).toHaveLength(0);
  });

  it("ignora serviços sem garantia", async () => {
    mockFindMany.mockResolvedValue([
      {
        number: 5,
        createdAt: new Date(),
        services: [
          { description: "Diagnóstico", service: { warrantyDays: null } },
          { description: "Lavagem", service: null },
        ],
      },
    ]);

    const alerts = await checkWarranty("vehicle-1", "tenant-1");
    expect(alerts).toHaveLength(0);
  });

  it("retorna múltiplos alertas", async () => {
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    mockFindMany.mockResolvedValue([
      {
        number: 20,
        createdAt: fiveDaysAgo,
        services: [
          { description: "Embreagem", service: { warrantyDays: 180 } },
          { description: "Retífica", service: { warrantyDays: 365 } },
        ],
      },
    ]);

    const alerts = await checkWarranty("vehicle-1", "tenant-1");
    expect(alerts).toHaveLength(2);
  });
});
