import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    const filePath = join(process.cwd(), "uploads", ...segments);

    // Prevent directory traversal
    if (!filePath.startsWith(join(process.cwd(), "uploads"))) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const buffer = await readFile(filePath);
    const ext = segments[segments.length - 1]?.split(".").pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    };

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeMap[ext || ""] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado" }, { status: 404 });
  }
}
