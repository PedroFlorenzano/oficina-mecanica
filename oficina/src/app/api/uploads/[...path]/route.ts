import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getFileStorage } from "@/infrastructure/storage";
import { isKeyOwnedByTenant } from "@/lib/file-access";
import { handleError } from "@/lib/api-handler";

/**
 * GET /api/uploads/<chave> — serve arquivos do storage ativo.
 *
 * A aplicação faz proxy em vez de entregar a URL do provedor ao navegador:
 * assim nenhum link continua válido fora do sistema e o acesso é sempre
 * verificado contra a sessão. São fotos de veículos de clientes.
 *
 * A chave precisa começar com `t/<tenantId>/`, comparado com a sessão. Qualquer
 * outro formato é recusado, inclusive o legado sem tenant no caminho.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await requireAuth();
    const { path: segments } = await params;
    const key = segments.join("/");

    if (!isKeyOwnedByTenant(key, session.user.tenantId)) {
      // Mesma resposta para "não é seu" e "não existe": não revela se o
      // arquivo existe em outra oficina.
      return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
    }

    const file = await getFileStorage().get(key);
    if (!file) {
      return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
    }

    return new NextResponse(Buffer.from(file.content), {
      headers: {
        "Content-Type": file.contentType,
        // Privado: o arquivo é específico do usuário autenticado, então não
        // deve ser guardado por CDN ou proxy compartilhado.
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
