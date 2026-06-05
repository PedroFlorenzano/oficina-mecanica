import NextAuth, { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { Role } from "@prisma/client";
import { adminContainer } from "@/infrastructure/container";
// BYPASSRLS: operação cross-tenant legítima — login busca usuário por email em todos os tenants
import { LoginUser } from "@/application/use-cases/users/LoginUser";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const useCase = new LoginUser(adminContainer.userRepository);
          const payload = await useCase.execute(credentials.email, credentials.password);
          if (!payload) return null;
          return { id: payload.userId, userId: payload.userId, tenantId: payload.tenantId, role: payload.role as Role, name: payload.name, customPermissions: payload.customPermissions };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as { userId: string; tenantId: string; role: Role; customPermissions?: string | null };
        token.userId = u.userId;
        token.tenantId = u.tenantId;
        token.role = u.role;
        token.customPermissions = u.customPermissions;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.userId = token.userId;
      session.user.tenantId = token.tenantId;
      session.user.role = token.role;
      session.user.customPermissions = token.customPermissions;
      return session;
    },
  },
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 86400 },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
