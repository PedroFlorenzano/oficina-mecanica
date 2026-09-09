import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/infrastructure/database/prisma";
import { RegisterTenant } from "@/application/use-cases/tenants/RegisterTenant";
import { handleError } from "@/lib/api-handler";
import { DAY, HOUR, enforceRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const body = await request.json();

    // Captcha (só exigido se TURNSTILE_SECRET_KEY estiver configurada)
    await verifyTurnstile(body?.turnstileToken, ip);

    // Endpoint público de criação de conta: limite por IP e teto global,
    // para impedir criação de oficinas em massa.
    await enforceRateLimit([
      {
        key: `register:ip:${ip}`,
        limit: 3,
        windowMs: HOUR,
        message: "Muitas tentativas de cadastro. Tente novamente em alguns minutos.",
      },
      {
        key: `register:ip:${ip}:day`,
        limit: 5,
        windowMs: DAY,
        message: "Limite diário de cadastros atingido para esta conexão. Fale com o suporte se precisar de mais contas.",
      },
      {
        key: "register:global",
        limit: 30,
        windowMs: HOUR,
        message: "Cadastros temporariamente indisponíveis por excesso de requisições. Tente novamente em alguns minutos.",
      },
    ]);

    const useCase = new RegisterTenant(prismaAdmin);
    const result = await useCase.execute(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
