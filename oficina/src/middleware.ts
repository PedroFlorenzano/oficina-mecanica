import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Rotas de API que funcionam sem sessão:
 * - /api/auth/*            → fluxo do NextAuth
 * - /api/public/*          → cadastro de oficina, agendamento e assinatura pública
 * - /api/health            → monitoramento externo (não faz login)
 * - /api/whatsapp/webhook  → callback da Evolution API
 * - /api/whatsapp/reminders→ cron (protegido por CRON_SECRET na própria rota)
 * - /api/billing/webhook   → callback do gateway (protegido por secret na rota)
 */
const PUBLIC_API_PREFIXES = [
  "/api/auth/",
  "/api/public/",
  "/api/health",
  "/api/whatsapp/webhook",
  "/api/whatsapp/reminders",
  "/api/billing/webhook",
];

const isPublicApi = (pathname: string) =>
  PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // API routes sem sessão → 401 JSON (não redirect)
    if (pathname.startsWith("/api/") && !isPublicApi(pathname) && !token) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // /dashboard/users → apenas ADMIN
    if (pathname.startsWith("/dashboard/users") && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        if (isPublicApi(pathname)) return true;
        if (pathname === "/login") return true;
        // For API routes, always pass to middleware function to handle 401 JSON
        if (pathname.startsWith("/api/")) return true;
        // For dashboard routes, require token
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
