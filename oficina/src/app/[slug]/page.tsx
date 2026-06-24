import { redirect } from "next/navigation";
import { prismaAdmin } from "@/infrastructure/database/prisma";

export default async function TenantEntryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const tenant = await prismaAdmin.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true, logo: true },
  });

  if (!tenant) {
    redirect("/login");
  }

  redirect(`/login?tenant=${slug}`);
}
