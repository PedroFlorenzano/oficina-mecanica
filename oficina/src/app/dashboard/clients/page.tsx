"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Edit, Users, UserX, UserCheck, History } from "lucide-react";
import Link from "next/link";
import ClientForm from "./ClientForm";

interface Client {
  id: string;
  name: string;
  document: string;
  docType: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  active: boolean;
  _count?: { vehicles: number; orders: number };
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [confirmInactivate, setConfirmInactivate] = useState<Client | null>(null);
  const [confirmActivate, setConfirmActivate] = useState<Client | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchClients = async (query = "", inactive = showInactive) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("search", query);
    if (inactive) params.set("includeInactive", "true");
    const res = await fetch(`/api/clients?${params.toString()}`);
    const data = await res.json();
    setClients(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchClients("", showInactive);
  }, [showInactive]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchClients(search, showInactive);
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditingClient(null);
    fetchClients(search, showInactive);
  };

  const handleInactivate = async () => {
    if (!confirmInactivate) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/clients/${confirmInactivate.id}`, { method: "DELETE" });
      if (res.ok) {
        if (!showInactive) {
          setClients((prev) => prev.filter((c) => c.id !== confirmInactivate.id));
        } else {
          setClients((prev) =>
            prev.map((c) => (c.id === confirmInactivate.id ? { ...c, active: false } : c))
          );
        }
        setConfirmInactivate(null);
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao inativar cliente");
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleActivate = async () => {
    if (!confirmActivate) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/clients/${confirmActivate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate" }),
      });
      if (res.ok) {
        setClients((prev) =>
          prev.map((c) => (c.id === confirmActivate.id ? { ...c, active: true } : c))
        );
        setConfirmActivate(null);
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao reativar cliente");
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
        <button
          onClick={() => { setEditingClient(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus size={18} />
          Novo Cliente
        </button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, CPF, CNPJ, telefone ou placa..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button type="submit" className="px-4 py-2.5 bg-slate-200 rounded-lg hover:bg-slate-300 text-sm font-medium">
            Buscar
          </button>
        </form>
        <label className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm cursor-pointer select-none hover:bg-slate-50">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          Mostrar inativos
        </label>
      </div>

      {/* Modal de edição/criação de cliente */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <ClientForm
              client={editingClient}
              onSaved={handleSaved}
              onCancel={() => { setShowForm(false); setEditingClient(null); }}
            />
          </div>
        </div>
      )}

      {/* Modal de confirmação de inativação */}
      {confirmInactivate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <UserX size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Inativar cliente</h3>
                <p className="text-sm text-slate-500">O histórico de OS será mantido</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 mb-6">
              Tem certeza que deseja inativar o cliente <span className="font-semibold">{confirmInactivate.name}</span>?
              O cliente poderá ser reativado a qualquer momento.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmInactivate(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                disabled={processing}
              >
                Cancelar
              </button>
              <button
                onClick={handleInactivate}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={processing}
              >
                {processing ? "Processando..." : "Confirmar inativação"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de reativação */}
      {confirmActivate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <UserCheck size={20} className="text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Reativar cliente</h3>
                <p className="text-sm text-slate-500">O cliente voltará a aparecer nas listagens</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 mb-6">
              Deseja reativar o cliente <span className="font-semibold">{confirmActivate.name}</span>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmActivate(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                disabled={processing}
              >
                Cancelar
              </button>
              <button
                onClick={handleActivate}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                disabled={processing}
              >
                {processing ? "Processando..." : "Confirmar reativação"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <p className="p-6 text-slate-500">Carregando...</p>
        ) : clients.length === 0 ? (
          <div className="p-8 text-center">
            <Users size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">Nenhum cliente encontrado</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Documento</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Telefone</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Veículos</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {clients.map((client) => (
                <tr key={client.id} className={`hover:bg-slate-50 ${!client.active ? "opacity-60" : ""}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">{client.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="inline-block bg-slate-100 text-xs px-2 py-0.5 rounded mr-2">{client.docType}</span>
                    {client.document}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{client.phone || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{client._count?.vehicles || 0}</td>
                  <td className="px-4 py-3">
                    {client.active ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Ativo</span>
                    ) : (
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Inativo</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditingClient(client); setShowForm(true); }}
                        className="text-blue-600 hover:text-blue-800"
                        title="Editar cliente"
                      >
                        <Edit size={16} />
                      </button>
                      <Link
                        href={`/dashboard/clients/${client.id}/history`}
                        className="text-slate-400 hover:text-slate-700"
                        title="Histórico de OS"
                      >
                        <History size={16} />
                      </Link>
                      {client.active ? (
                        <button
                          onClick={() => setConfirmInactivate(client)}
                          className="text-red-400 hover:text-red-600"
                          title="Inativar cliente"
                        >
                          <UserX size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmActivate(client)}
                          className="text-green-500 hover:text-green-700"
                          title="Reativar cliente"
                        >
                          <UserCheck size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
