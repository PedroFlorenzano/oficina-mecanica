import { NextRequest, NextResponse } from "next/server";
import { container } from "@/infrastructure/container";
import { handleError } from "@/lib/api-handler";

// Rota PÚBLICA — não requer autenticação (cliente acessa via link do WhatsApp)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const signature = await container.whatsAppRepository.findSignatureByToken(token);

    if (!signature) {
      return NextResponse.json({ error: "Link inválido" }, { status: 404 });
    }

    if (signature.signedAt) {
      return NextResponse.json({ error: "Este documento já foi assinado", signed: true }, { status: 400 });
    }

    if (new Date() > signature.expiresAt) {
      return NextResponse.json({ error: "Link expirado" }, { status: 410 });
    }

    // Buscar dados da OS para exibir ao cliente
    const order = await container.orderRepository.findById(signature.orderId);

    return NextResponse.json({
      signerName: signature.signerName,
      type: signature.type,
      order: order ? {
        number: order.number,
        totalAmount: order.totalAmount,
        vehicle: `${order.vehicle.brand} ${order.vehicle.model}`,
        plate: order.vehicle.plate,
      } : null,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const signature = await container.whatsAppRepository.findSignatureByToken(token);

    if (!signature) {
      return NextResponse.json({ error: "Link inválido" }, { status: 404 });
    }

    if (signature.signedAt) {
      return NextResponse.json({ error: "Este documento já foi assinado" }, { status: 400 });
    }

    if (new Date() > signature.expiresAt) {
      return NextResponse.json({ error: "Link expirado" }, { status: 410 });
    }

    const body = await request.json();
    if (!body.imageData || !body.imageData.startsWith("data:image/")) {
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
    }

    const completed = await container.whatsAppRepository.completeSignature(signature.id, body.imageData);

    // TODO: Atualizar status da OS automaticamente
    // Se type === APPROVAL → OS muda para IN_PROGRESS
    // Se type === DELIVERY → OS muda para DELIVERED

    return NextResponse.json({ success: true, signedAt: completed.signedAt });
  } catch (error) {
    return handleError(error);
  }
}
