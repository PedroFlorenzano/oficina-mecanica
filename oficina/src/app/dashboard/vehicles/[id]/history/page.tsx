"use client";

import { useState, useEffect, use } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";

interface OrderSummary {
  id: string;
  number: number;
  status: string;
  totalAmount: number;
  createdAt: string;
  client?: { name: string };
}

interface VehicleInfo {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Aberta", color: "bg-blue-100 text-blue-700" },
  IN_PROGRESS: { label: "Em Execução", color: "bg-yellow-100 text-yellow-700" },
  WAITING_PART: { label: "Aguardando Peça", color: "bg-orange-100 text-orange-700" },
  WAITING_APPROVAL: { label: "Aguardando Aprovação", color: "bg-purple-100 text-purple-700" },
  COMPLETED: { label: "Concluída", color: "bg-green-100 text-green-700" },
  DELIVERED: { label: "Entregue", color: "bg-slate-100 text-slate-700" },
  CANCELLED: { label: "Cancelada", color: "bg-red-100 text-red-700" },
};

export default function VehicleHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [vehicle, setVehicle] = useState<VehicleInfo | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/vehicles/${id}`).then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch(`/api/vehicles/${id}/history`).then((r) => { if (!r.ok) return []; return r.json(); }),
    ]).then(([vehicleData, ordersData]) => {
      setVehicle(vehicleData);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
    }).catch(() => {
      setVehicle(null);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="p-6 text-slate-500">Carregando...</p>;
  if (!vehicle) return <p className="p-6 text-red-500">Veículo não encontrado</p>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/vehicles" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Histórico de OS — {vehicle.plate}
          </h1>
          <p className="text-sm text-slate-500">
            {vehicle.brand} {vehicle.model} {vehicle.year}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-8 text-center">
            <FileText size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">Nenhuma OS encontrada para este veículo</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Nº OS</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Data</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Total</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((order) => {
                const status = statusLabels[order.status] || { label: order.status, color: "" };
                return (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">#{order.number}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{order.client?.name || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        Ver OS
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
