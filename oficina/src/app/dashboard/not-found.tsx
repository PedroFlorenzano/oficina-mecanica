import Link from "next/link";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-slate-800 mb-2">
          Página não encontrada
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          A página que você está procurando não existe.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
      >
        Voltar ao Dashboard
      </Link>
    </div>
  );
}
