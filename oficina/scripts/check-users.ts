import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const users = await p.user.findMany({
    select: { id: true, email: true, role: true, active: true, failedLoginCount: true, lockedUntil: true, password: true },
  });
  console.log(JSON.stringify(users, null, 2));
}
main().finally(() => p.$disconnect());
