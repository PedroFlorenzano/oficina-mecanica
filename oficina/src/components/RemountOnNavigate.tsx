"use client";

import { usePathname } from "next/navigation";
import { useRef, useEffect } from "react";

/**
 * Detecta navegação soft e força os componentes filhos a re-executar effects.
 */
export default function RemountOnNavigate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFirstRender = useRef(true);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (prevPathname.current !== pathname) {
      prevPathname.current = pathname;
      // Força hard navigation (equivalente a F5)
      window.location.replace(pathname);
    }
  }, [pathname]);

  return <>{children}</>;
}
