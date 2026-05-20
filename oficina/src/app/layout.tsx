import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oficina - Sistema de Gestão",
  description: "Sistema SaaS de gestão para oficinas mecânicas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
