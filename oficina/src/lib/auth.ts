import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
export { authOptions };

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Response(
      JSON.stringify({ error: "Não autenticado" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  return session;
}
