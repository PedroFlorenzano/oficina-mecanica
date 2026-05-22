import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import { IServiceOrderRepository } from "@/domain/repositories/IServiceOrderRepository";
import { NotFoundError } from "@/domain/errors/DomainError";
import { OSDocument } from "@/components/pdf/OSDocument";

export class GenerateOrderPDF {
  constructor(private orderRepo: IServiceOrderRepository) {}

  async execute(orderId: string, tenantId: string): Promise<Buffer> {
    const order = await this.orderRepo.findById(orderId);
    if (!order || order.tenantId !== tenantId) {
      throw new NotFoundError("Ordem de serviço não encontrada");
    }

    const element = React.createElement(OSDocument, { order }) as unknown as React.ReactElement<DocumentProps>;
    return renderToBuffer(element) as Promise<Buffer>;
  }
}
