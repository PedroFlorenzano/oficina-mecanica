"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useEffect } from "react";

/**
 * Força reload completo (como F5) quando a rota muda via navegação soft.
 * Resolve o problema do Next.js App Router não re-executar useEffect.
 */
export default function RemountOnNavigate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      router.refresh();
    }
  }, [pathname, router]);

  return <>{children}</>;
}
