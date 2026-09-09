import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/infrastructure/database/prisma";
import { RegisterTenant } from "@/application/use-cases/tenants/RegisterTenant";
import { handleError } from "@/lib/api-handler";
import {
  DAY,
  HOUR,
  checkRateLimit,
  enforceRateLimit,
  getClientIp,
  recordRateLimitHit,
} from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const body = await request.json();

    // Captcha (só exigido se TURNSTILE_SECRET_KEY estiver configurada)
    await verifyTurnstile(body?.turnstileToken, ip);

    // Duas cotas distintas, de propósito:
    // - tentativas: barra rajada de requisições, com folga para quem erra o formulário
    // - contas criadas: impede criação de oficinas em massa
    // Erro de preenchimento (CNPJ inválido, e-mail em uso) consome apenas a cota
    // de tentativas, nunca a de contas.
    await enforceRateLimit([
      {
        key: `register:attempt:ip:${ip}`,
        limit: 15,
        windowMs: HOUR,
        message: "Muitas tentativas de cadastro. Aguarde alguns minutos e tente novamente.",
      },
      {
        key: "register:attempt:global",
        limit: 100,
        windowMs: HOUR,
        message: "Cadastros temporariamente indisponíveis por excesso de requisições. Tente novamente em alguns minutos.",
      },
    ]);

    const successKey = `register:success:ip:${ip}`;
    await checkRateLimit([
      {
        key: successKey,
        limit: 3,
        windowMs: DAY,
        message: "Limite de oficinas cadastradas por dia atingido nesta conexão. Fale com o suporte se precisar de mais contas.",
      },
    ]);

    const useCase = new RegisterTenant(prismaAdmin);
    const result = await useCase.execute(body);

    // Só conta na cota diária quando a oficina foi realmente criada
    await recordRateLimitHit(successKey);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
