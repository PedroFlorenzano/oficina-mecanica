"use client";

import { useState, useEffect } from "react";
import { Plus, Truck, Pencil, Trash2 } from "lucide-react";
import SupplierForm from "./SupplierForm";

interface Supplier {
  id: string;
  name: string;
  cnpj: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  defaultLeadTimeDays: number;
  active: boolean;
}

export default function FornecedoresPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/suppliers");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSuppliers(data);
    } catch {
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const handleNew = () => {
    setEditingSupplier(null);
    setShowForm(true);
  };

  const handleEdit = async (supplier: Supplier) => {
    // Buscar dados completos (com searchConfigs)
    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`);
      if (res.ok) {
        const full = await res.json();
        setEditingSupplier(full);
      } else {
        setEditingSupplier(supplier);
      }
    } catch {
      setEditingSupplier(supplier);
    }
    setShowForm(true);
  };

  const handleDelete = async (supplier: Supplier) => {
    if (!confirm(`Excluir fornecedor "${supplier.name}"?`)) return;

    const res = await fetch(`/api/suppliers/${supplier.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Erro ao excluir");
      return;
    }
    fetchSuppliers();
  };

  const handleSaved = () => {
    setShowForm(false);
    setEditingSupplier(null);
    fetchSuppliers();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Fornecedores</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie seus fornecedores e prazos de entrega</p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus size={18} /> Novo Fornecedor
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <p className="p-6 text-slate-500">Carregando...</p>
        ) : suppliers.length === 0 ? (
          <div className="p-8 text-center">
            <Truck size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">Nenhum fornecedor cadastrado</p>
            <p className="text-xs text-slate-400 mt-1">Cadastre fornecedores para calcular prazos de entrega das peças</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">CNPJ</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Telefone</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">E-mail</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Prazo (dias úteis)</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {suppliers.map((s) => (
                <tr
                  key={s.id}
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => handleEdit(s)}
                >
                  <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                  <td className="px-4 py-3 text-slate-600">{s.cnpj || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{s.phone || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{s.email || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                      {s.defaultLeadTimeDays}d
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
            <SupplierForm
              supplier={editingSupplier}
              onSaved={handleSaved}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
