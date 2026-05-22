import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const p = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("password123", 10);
  
  await p.user.updateMany({
    where: { tenantId: "demo-tenant" },
    data: { password: hash, failedLoginCount: 0, lockedUntil: null },
  });

  console.log("Senhas atualizadas com sucesso. Hash:", hash);
}

main().finally(() => p.$disconnect());
