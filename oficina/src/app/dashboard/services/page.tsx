"use client";

import { useState, useEffect } from "react";
import { Plus, Wrench, Pencil, Trash2, Power } from "lucide-react";
import ServiceForm from "./ServiceForm";

interface Service {
  id: string;
  code: string | null;
  description: string;
  category: string | null;
  estimatedTime: number | null;
  defaultPrice: number;
  pricingType: string;
  active: boolean;
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const fetchServices = async () => {
    setLoading(true);
    const res = await fetch("/api/services");
    const data = await res.json();
    setServices(data);
    setLoading(false);
  };

  useEffect(() => { fetchServices(); }, []);

  const handleNew = () => {
    setEditingService(null);
    setShowForm(true);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setShowForm(true);
  };

  const handleToggleActive = async (service: Service) => {
    const res = await fetch(`/api/services/${service.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...service, active: !service.active }),
    });
    if (res.ok) fetchServices();
  };

  const handleDelete = async (service: Service) => {
    if (!confirm(`Excluir serviço "${service.description}"?`)) return;

    const res = await fetch(`/api/services/${service.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Erro ao excluir");
      return;
    }
    fetchServices();
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditingService(null);
    fetchServices();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Catálogo de Serviços</h1>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus size={18} /> Novo Serviço
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <p className="p-6 text-slate-500">Carregando...</p>
        ) : services.length === 0 ? (
          <div className="p-8 text-center">
            <Wrench size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">Nenhum serviço cadastrado</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Serviço</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Categoria</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Tempo Est.</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Preço Padrão</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {services.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => handleEdit(s)}
                >
                  <td className="px-4 py-3 font-medium text-slate-800">{s.description}</td>
                  <td className="px-4 py-3 text-slate-600">{s.category || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{s.estimatedTime ? `${s.estimatedTime} min` : "—"}</td>
                  <td className="px-4 py-3 text-slate-700">R$ {s.defaultPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-600">{s.pricingType === "TIME" ? "Por Tempo" : "Por Valor"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${s.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {s.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(s); }}
                      className="text-slate-400 hover:text-blue-600 p-1"
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleActive(s); }}
                      className={`p-1 ml-1 ${s.active ? "text-slate-400 hover:text-orange-600" : "text-slate-400 hover:text-green-600"}`}
                      title={s.active ? "Desativar" : "Ativar"}
                    >
                      <Power size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(s); }}
                      className="text-slate-400 hover:text-red-600 p-1 ml-1"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
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
            <ServiceForm
              service={editingService}
              onSaved={handleSaved}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
