import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import type { DocumentProps } from "@react-pdf/renderer";
import { IServiceOrderRepository } from "@/domain/repositories/IServiceOrderRepository";
import { NotFoundError } from "@/domain/errors/DomainError";
import { OSDocument } from "@/components/pdf/OSDocument";
import type { OrderVia } from "@/components/pdf/osVia";

export class GenerateOrderPDF {
  constructor(private orderRepo: IServiceOrderRepository) {}

  async execute(orderId: string, tenantId: string, via: OrderVia = "interna"): Promise<Buffer> {
    const order = await this.orderRepo.findById(orderId);
    if (!order || order.tenantId !== tenantId) {
      throw new NotFoundError("Ordem de serviço não encontrada");
    }

    const element = React.createElement(OSDocument, { order, via }) as unknown as React.ReactElement<DocumentProps>;
    return renderToBuffer(element) as Promise<Buffer>;
  }
}
