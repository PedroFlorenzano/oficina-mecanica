"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

/**
 * Hook que retorna um fetch wrapper que redireciona para /login em caso de 401.
 * Evita páginas vazias quando a sessão expira durante navegação client-side.
 */
export function useAuthFetch() {
  const router = useRouter();

  const authFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const res = await fetch(input, init);
      if (res.status === 401) {
        router.replace("/login");
        throw new Error("Sessão expirada");
      }
      return res;
    },
    [router]
  );

  return authFetch;
}
