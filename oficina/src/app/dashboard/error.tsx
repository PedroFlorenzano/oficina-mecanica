"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">
          Algo deu errado
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Ocorreu um erro ao carregar esta página.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          Tentar novamente
        </button>
        <a
          href="/dashboard"
          className="px-4 py-2 border border-slate-300 text-sm rounded-lg hover:bg-slate-50"
        >
          Ir para Dashboard
        </a>
      </div>
    </div>
  );
}
