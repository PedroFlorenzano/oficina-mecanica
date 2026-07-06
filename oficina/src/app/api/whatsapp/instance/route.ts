import { NextRequest, NextResponse } from "next/server";
import { createContainer } from "@/infrastructure/container";
import { handleError } from "@/lib/api-handler";
import { requireAuth } from "@/lib/auth";
import {
  createEvolutionInstance,
  getInstanceQRCode,
  getConnectionState,
} from "@/infrastructure/whatsapp/EvolutionInstanceManager";
import { prisma } from "@/infrastructure/database/prisma";

export async function GET() {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
    }

    const container = createContainer(tenantId);
    const config = await container.whatsAppRepository.getConfig(tenantId);

    if (!config?.phoneNumberId) {
      return NextResponse.json({ state: "not_created", qrcode: null });
    }

    // Verificar estado da conexão
    const instanceName = config.phoneNumberId;
    const connectionState = await getConnectionState(instanceName);

    if (connectionState.state === "connecting") {
      // Buscar QR code atualizado
      const qr = await getInstanceQRCode(instanceName);
      return NextResponse.json({ state: "connecting", qrcode: qr.qrcode || null });
    }

    return NextResponse.json({ state: connectionState.state, qrcode: null });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const tenantId = session.user.tenantId;
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Acesso restrito" }, { status: 403 });
    }

    const body = await request.json();
    const action = body.action as string;

    // Buscar slug do tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, name: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: "Tenant não encontrado" }, { status: 404 });
    }

    const container = createContainer(tenantId);

    if (action === "create") {
      // Criar instância na Evolution API
      const webhookUrl = body.webhookUrl || undefined;
      const result = await createEvolutionInstance(tenant.slug, webhookUrl);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      // Salvar o instanceName como phoneNumberId na config do tenant
      await container.whatsAppRepository.upsertConfig(tenantId, {
        phoneNumberId: result.instanceName || `operare-${tenant.slug}`,
        businessName: tenant.name,
        enabled: false, // Só habilita depois de conectar
      });

      return NextResponse.json({
        state: "connecting",
        instanceName: result.instanceName,
        qrcode: result.qrcode || null,
      }, { status: 201 });
    }

    if (action === "connect") {
      // Buscar QR code para reconectar
      const config = await container.whatsAppRepository.getConfig(tenantId);
      if (!config?.phoneNumberId) {
        return NextResponse.json({ error: "Instância não criada" }, { status: 400 });
      }

      const qr = await getInstanceQRCode(config.phoneNumberId);
      if (!qr.success) {
        return NextResponse.json({ error: qr.error }, { status: 400 });
      }

      return NextResponse.json({ state: "connecting", qrcode: qr.qrcode });
    }

    if (action === "check") {
      // Verificar e atualizar status
      const config = await container.whatsAppRepository.getConfig(tenantId);
      if (!config?.phoneNumberId) {
        return NextResponse.json({ state: "not_created" });
      }

      const state = await getConnectionState(config.phoneNumberId);

      // Se conectou, habilitar automaticamente
      if (state.state === "open" && !config.enabled) {
        await container.whatsAppRepository.upsertConfig(tenantId, { enabled: true });
      }

      return NextResponse.json({ state: state.state, enabled: state.state === "open" });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    return handleError(error);
  }
}
