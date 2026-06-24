"use client";

/**
 * Wrapper que passa children diretamente.
 * Anteriormente forçava hard navigation — removido por causar flash na tela.
 */
export default function RemountOnNavigate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
