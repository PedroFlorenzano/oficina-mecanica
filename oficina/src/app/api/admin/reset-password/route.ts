import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/infrastructure/database/prisma";

// TOKEN TEMPORÁRIO — remover este endpoint após uso
const TEMP_TOKEN = "paiffer-reset-2026-07-30";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, email, newPassword } = body;

    if (token !== TEMP_TOKEN) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    if (!email) {
      return NextResponse.json({ error: "Email obrigatório" }, { status: 400 });
    }

    // Buscar usuário
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true, name: true, role: true, tenantId: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: `Usuário com email "${email}" não encontrado` },
        { status: 404 }
      );
    }

    // Se não mandou newPassword, só retorna os dados do user (lookup mode)
    if (!newPassword) {
      return NextResponse.json({
        found: true,
        user: { email: user.email, name: user.name, role: user.role, tenantId: user.tenantId },
      });
    }

    // Resetar senha
    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hash },
    });

    return NextResponse.json({
      success: true,
      message: `Senha de ${user.email} (${user.name}) resetada com sucesso`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    );
  }
}

// GET para lookup rápido de ambos emails
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (token !== TEMP_TOKEN) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const emails = ["felipe.paiffer@gmail.com", "mayraarambasic@hotmail.com"];

  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { email: true, name: true, role: true, tenantId: true, createdAt: true },
  });

  return NextResponse.json({ users });
}
