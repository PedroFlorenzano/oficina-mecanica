"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Plus, Wrench, Pencil, Trash2, Power, Package, Search, X } from "lucide-react";
import Link from "next/link";
import ServiceForm from "./ServiceForm";
import { formatCurrency } from "@/lib/format";
import { hasPermission, parseCustomPermissions, Role } from "@/lib/permissions";

interface Service {
  id: string;
  code: string | null;
  description: string;
  category: string | null;
  estimatedTime: number | null;
  defaultPrice: number;
  pricingType: string;
  commissionRate: number | null;
  active: boolean;
}

export default function ServicesPage() {
  const { data: session } = useSession();
  const role = (session?.user?.role ?? "MECHANIC") as Role;
  const perms = parseCustomPermissions(session?.user?.customPermissions);
  const canCreate = hasPermission(role, "services", "create", perms);
  const canUpdate = hasPermission(role, "services", "update", perms);
  const canDelete = hasPermission(role, "services", "delete", perms);

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("");

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/services");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setServices(data);
    } catch {
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchServices(); }, []);

  // Filtro por descrição, categoria ou código
  const filteredServices = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return services;
    return services.filter((s) =>
      [s.description, s.category, s.code].some((field) => field?.toLowerCase().includes(term))
    );
  }, [services, search]);

  const visibleSelectedIds = useMemo(
    () => selectedIds.filter((id) => filteredServices.some((s) => s.id === id)),
    [selectedIds, filteredServices]
  );
  const allVisibleSelected =
    filteredServices.length > 0 && visibleSelectedIds.length === filteredServices.length;

  const toggleSelect = (id: string) => {
    setBulkMessage("");
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    setBulkMessage("");
    setSelectedIds(allVisibleSelected ? [] : filteredServices.map((s) => s.id));
  };

  const handleBulkDelete = async () => {
    if (visibleSelectedIds.length === 0) return;
    if (!confirm(`Excluir ${visibleSelectedIds.length} serviço(s) selecionado(s)?`)) return;

    setBulkDeleting(true);
    setBulkMessage("");
    try {
      const res = await fetch("/api/services/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: visibleSelectedIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBulkMessage(data.error || "Erro ao excluir serviços");
        return;
      }
      const failed = (data.failed ?? []) as { description?: string; reason: string }[];
      setBulkMessage(
        failed.length === 0
          ? `${data.deleted.length} serviço(s) excluído(s).`
          : `${data.deleted.length} excluído(s). Não excluídos: ${failed
              .map((f) => `${f.description ?? "item"} (${f.reason})`)
              .join("; ")}`
      );
      setSelectedIds([]);
      await fetchServices();
    } finally {
      setBulkDeleting(false);
    }
  };

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
        <div className="flex items-center gap-2">
          <Link href="/dashboard/services/kits" className="flex items-center gap-2 border border-slate-300 text-slate-700 px-4 py-2.5 rounded-lg hover:bg-slate-50 text-sm font-medium">
            <Package size={18} /> Kits
          </Link>
          {canCreate && (
          <button
            onClick={handleNew}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Plus size={18} /> Novo Serviço
          </button>
          )}
        </div>
      </div>

      {/* Busca + ações em lote */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por descrição, categoria ou código..."
            aria-label="Buscar serviço"
            className="w-full pl-9 pr-9 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              aria-label="Limpar busca"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
        {canDelete && visibleSelectedIds.length > 0 && (
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
          >
            <Trash2 size={16} />
            {bulkDeleting
              ? "Excluindo..."
              : `Excluir selecionados (${visibleSelectedIds.length})`}
          </button>
        )}
      </div>

      {bulkMessage && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-slate-50 border border-slate-200 text-slate-700">
          {bulkMessage}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <p className="p-6 text-slate-500">Carregando...</p>
        ) : filteredServices.length === 0 ? (
          <div className="p-8 text-center">
            <Wrench size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">
              {search ? "Nenhum serviço encontrado para essa busca" : "Nenhum serviço cadastrado"}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {canDelete && (
                  <th className="text-left px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      aria-label="Selecionar todos os serviços listados"
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                )}
                <th className="text-left px-4 py-3 font-medium text-slate-600">Serviço</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Categoria</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Tempo Est.</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Preço Padrão</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Comissão</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredServices.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => handleEdit(s)}
                >
                  {canDelete && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(s.id)}
                        onChange={() => toggleSelect(s.id)}
                        aria-label={`Selecionar ${s.description}`}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 font-medium text-slate-800">{s.description}</td>
                  <td className="px-4 py-3 text-slate-600">{s.category || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{s.estimatedTime ? `${s.estimatedTime} min` : "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{formatCurrency(s.defaultPrice)}</td>
                  <td className="px-4 py-3 text-slate-600">{s.pricingType === "TIME" ? "Por Tempo" : "Por Valor"}</td>
                  <td className="px-4 py-3 text-slate-600">{s.commissionRate != null ? `${s.commissionRate}%` : "Padrão"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${s.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {s.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canUpdate && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(s); }}
                      className="text-slate-400 hover:text-blue-600 p-1"
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>
                    )}
                    {canUpdate && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleActive(s); }}
                      className={`p-1 ml-1 ${s.active ? "text-slate-400 hover:text-orange-600" : "text-slate-400 hover:text-green-600"}`}
                      title={s.active ? "Desativar" : "Ativar"}
                    >
                      <Power size={16} />
                    </button>
                    )}
                    {canDelete && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(s); }}
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
