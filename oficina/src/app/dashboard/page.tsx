import { ClipboardList, Users, Car, Package } from "lucide-react";

const stats = [
  { label: "Clientes", value: "0", icon: Users, color: "bg-blue-500" },
  { label: "Veículos", value: "0", icon: Car, color: "bg-green-500" },
  { label: "OS Abertas", value: "0", icon: ClipboardList, color: "bg-orange-500" },
  { label: "Itens em Estoque", value: "0", icon: Package, color: "bg-purple-500" },
];

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4"
            >
              <div className={`${stat.color} p-3 rounded-lg`}>
                <Icon size={22} className="text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Últimas Ordens de Serviço</h2>
        <p className="text-slate-500">Nenhuma OS cadastrada ainda.</p>
      </div>
    </div>
  );
}
