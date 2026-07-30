import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // API routes sem sessão → 401 JSON (não redirect)
    if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/") && !pathname.startsWith("/api/public/") && !pathname.startsWith("/api/whatsapp/webhook") && !pathname.startsWith("/api/whatsapp/reminders") && !pathname.startsWith("/api/billing/webhook") && !token) {
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
        if (pathname.startsWith("/api/auth/")) return true;
        if (pathname.startsWith("/api/public/")) return true;
        if (pathname.startsWith("/api/whatsapp/webhook")) return true;
        if (pathname.startsWith("/api/whatsapp/reminders")) return true;
        if (pathname.startsWith("/api/billing/webhook")) return true;
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
