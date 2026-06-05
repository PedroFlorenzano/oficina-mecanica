import { NextRequest, NextResponse } from "next/server";
import { adminContainer } from "@/infrastructure/container";
import { handleError } from "@/lib/api-handler";

// BYPASSRLS: operação cross-tenant legítima — assinatura pública sem tenant definido
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const signature = await adminContainer.whatsAppRepository.findSignatureByToken(token);

    if (!signature) {
      return NextResponse.json({ error: "Link inválido" }, { status: 404 });
    }

    if (signature.signedAt) {
      return NextResponse.json({ error: "Este documento já foi assinado", signed: true }, { status: 400 });
    }

    if (new Date() > signature.expiresAt) {
      return NextResponse.json({ error: "Link expirado" }, { status: 410 });
    }

    const order = await adminContainer.orderRepository.findById(signature.orderId);

    return NextResponse.json({
      signerName: signature.signerName,
      type: signature.type,
      order: order ? {
        number: order.number,
        totalAmount: order.totalAmount,
        vehicle: `${order.vehicle.brand} ${order.vehicle.model}`,
        plate: order.vehicle.plate,
        mileage: order.mileage,
        notes: order.notes,
        complaints: order.complaints.map((c: { number: number; description: string; services: { description: string; price: number }[]; parts: { description: string; quantity: number; unitPrice: number; totalPrice: number }[] }) => ({
          number: c.number,
          description: c.description,
          services: c.services.map((s) => ({
            description: s.description,
            price: s.price,
          })),
          parts: c.parts.map((p) => ({
            description: p.description,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
            totalPrice: p.totalPrice,
          })),
        })),
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
    const signature = await adminContainer.whatsAppRepository.findSignatureByToken(token);

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

    const completed = await adminContainer.whatsAppRepository.completeSignature(signature.id, body.imageData);

    const newStatus = signature.type === "APPROVAL" ? "OPEN" : "DELIVERED";
    await adminContainer.orderRepository.updateStatus(signature.orderId, newStatus, "system-signature");

    return NextResponse.json({ success: true, signedAt: completed.signedAt });
  } catch (error) {
    return handleError(error);
  }
}
