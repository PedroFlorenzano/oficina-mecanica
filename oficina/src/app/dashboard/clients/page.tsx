"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Edit, Users } from "lucide-react";
import ClientForm from "./ClientForm";

interface Client {
  id: string;
  name: string;
  document: string;
  docType: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  _count?: { vehicles: number; orders: number };
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchClients = async (query = "") => {
    setLoading(true);
    const res = await fetch(`/api/clients?search=${encodeURIComponent(query)}`);
    const data = await res.json();
    setClients(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchClients(search);
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditingClient(null);
    fetchClients(search);
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

      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex gap-2">
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
        </div>
      </form>

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
                <th className="text-left px-4 py-3 font-medium text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{client.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="inline-block bg-slate-100 text-xs px-2 py-0.5 rounded mr-2">{client.docType}</span>
                    {client.document}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{client.phone || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{client._count?.vehicles || 0}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setEditingClient(client); setShowForm(true); }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit size={16} />
                    </button>
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
