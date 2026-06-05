import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/infrastructure/database/prisma";
import { ProcessBillingWebhook } from "@/application/use-cases/billing/ProcessBillingWebhook";
import { handleError } from "@/lib/api-handler";

export async function POST(request: NextRequest) {
  try {
    // Validate webhook secret
    const secret = request.headers.get("x-webhook-secret") || request.nextUrl.searchParams.get("secret");
    if (!process.env.BILLING_WEBHOOK_SECRET || secret !== process.env.BILLING_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const useCase = new ProcessBillingWebhook(prismaAdmin);
    await useCase.execute(body);

    return NextResponse.json({ received: true });
  } catch (error) {
    return handleError(error);
  }
}
