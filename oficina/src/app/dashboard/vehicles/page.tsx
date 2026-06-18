"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Plus, Car, Search, Pencil, Trash2, History } from "lucide-react";
import Link from "next/link";
import VehicleForm from "./VehicleForm";
import { hasPermission, parseCustomPermissions, Role } from "@/lib/permissions";

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  yearModel?: number | null;
  color: string | null;
  fuel: string | null;
  chassis: string | null;
  mileage: number;
  clientId: string;
  client: { id: string; name: string };
}

export default function VehiclesPage() {
  const { data: session } = useSession();
  const role = (session?.user?.role ?? "MECHANIC") as Role;
  const perms = parseCustomPermissions(session?.user?.customPermissions);
  const canCreate = hasPermission(role, "vehicles", "create", perms);
  const canUpdate = hasPermission(role, "vehicles", "update", perms);
  const canDelete = hasPermission(role, "vehicles", "delete", perms);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const fetchVehicles = async (query = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vehicles?search=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setVehicles(data);
    } catch {
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchVehicles(); }, []);

  const handleNew = () => {
    setEditingVehicle(null);
    setShowForm(true);
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setShowForm(true);
  };

  const handleDelete = async (vehicle: Vehicle) => {
    if (!confirm(`Excluir veículo ${vehicle.plate} (${vehicle.brand} ${vehicle.model})?`)) return;

    const res = await fetch(`/api/vehicles/${vehicle.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Erro ao excluir");
      return;
    }
    fetchVehicles(search);
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditingVehicle(null);
    fetchVehicles(search);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Veículos</h1>
        {canCreate && (
        <button
          onClick={handleNew}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus size={18} /> Novo Veículo
        </button>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); fetchVehicles(search); }} className="mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por placa, modelo ou cliente..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button type="submit" className="px-4 py-2.5 bg-slate-200 rounded-lg hover:bg-slate-300 text-sm font-medium">Buscar</button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <p className="p-6 text-slate-500">Carregando...</p>
        ) : vehicles.length === 0 ? (
          <div className="p-8 text-center">
            <Car size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">Nenhum veículo encontrado</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Placa</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Veículo</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Ano</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Cor</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">KM</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Proprietário</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {vehicles.map((v) => (
                <tr
                  key={v.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => handleEdit(v)}
                >
                  <td className="px-4 py-3 font-mono font-medium text-slate-800">{v.plate}</td>
                  <td className="px-4 py-3 text-slate-700">{v.brand} {v.model}</td>
                  <td className="px-4 py-3 text-slate-600">{v.year}{v.yearModel ? `/${v.yearModel}` : ""}</td>
                  <td className="px-4 py-3 text-slate-600">{v.color || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{v.mileage.toLocaleString("pt-BR")} km</td>
                  <td className="px-4 py-3 text-slate-600">{v.client.name}</td>
                  <td className="px-4 py-3 text-right">
                    {canUpdate && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(v); }}
                      className="text-slate-400 hover:text-blue-600 p-1"
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                    )}
                    <Link
                      href={`/dashboard/vehicles/${v.id}/history`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-slate-400 hover:text-slate-700 p-1 inline-flex"
                      title="Histórico de OS"
                    >
                      <History size={16} />
                    </Link>
                    {canDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(v); }}
                      className="text-slate-400 hover:text-red-600 p-1 ml-1"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <VehicleForm
              vehicle={editingVehicle}
              onSaved={handleSaved}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
