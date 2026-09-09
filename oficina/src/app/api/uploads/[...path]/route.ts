import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getFileStorage } from "@/infrastructure/storage";
import { handleError } from "@/lib/api-handler";

/**
 * GET /api/uploads/<chave> — serve arquivos do storage ativo.
 *
 * A aplicação faz proxy em vez de entregar a URL do provedor ao navegador:
 * assim nenhum link continua válido fora do sistema e o acesso é sempre
 * verificado contra a sessão. São fotos de veículos de clientes.
 *
 * Chaves novas têm o formato `t/<tenantId>/orders/<orderId>/<uuid>.<ext>`, o
 * que permite recusar leitura de arquivo de outro tenant sem ir ao banco.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await requireAuth();
    const { path: segments } = await params;

    if (segments.some((segment) => segment === "..")) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const key = segments.join("/");

    // Chave no formato novo: o tenant está no caminho e precisa bater com a sessão
    if (segments[0] === "t") {
      if (segments[1] !== session.user.tenantId) {
        return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
      }
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
