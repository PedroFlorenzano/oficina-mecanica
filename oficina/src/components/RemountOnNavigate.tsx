"use client";

import { usePathname } from "next/navigation";

/**
 * Wrapper que força remount dos children quando a rota muda.
 * Resolve o problema do Next.js App Router não re-executar useEffect
 * em navegação soft (componente preservado no Router Cache).
 */
export default function RemountOnNavigate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div key={pathname}>{children}</div>;
}
