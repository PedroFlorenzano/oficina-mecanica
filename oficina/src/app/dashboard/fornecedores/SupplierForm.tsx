"use client";

import { useState } from "react";
import { X } from "lucide-react";

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

interface SupplierFormProps {
  supplier: Supplier | null;
  onSaved: () => void;
  onCancel: () => void;
}

export default function SupplierForm({ supplier, onSaved, onCancel }: SupplierFormProps) {
  const [name, setName] = useState(supplier?.name || "");
  const [cnpj, setCnpj] = useState(supplier?.cnpj || "");
  const [phone, setPhone] = useState(supplier?.phone || "");
  const [email, setEmail] = useState(supplier?.email || "");
  const [website, setWebsite] = useState(supplier?.website || "");
  const [defaultLeadTimeDays, setDefaultLeadTimeDays] = useState(supplier?.defaultLeadTimeDays ?? 3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      name,
      cnpj: cnpj || undefined,
      phone: phone || undefined,
      email: email || undefined,
      website: website || undefined,
      defaultLeadTimeDays,
    };

    const url = supplier ? `/api/suppliers/${supplier.id}` : "/api/suppliers";
    const method = supplier ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erro ao salvar fornecedor");
      setSaving(false);
      return;
    }

    setSaving(false);
    onSaved();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h2 className="text-lg font-semibold text-slate-800">
          {supplier ? "Editar Fornecedor" : "Novo Fornecedor"}
        </h2>
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <X size={20} />
        </button>
      </div>

      <div className="p-6 space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nome <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ex: Cofap Distribuidora"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">CNPJ</label>
            <input
              type="text"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="00.000.000/0000-00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="(11) 99999-9999"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="contato@fornecedor.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://www.fornecedor.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Prazo de entrega padrão (dias úteis)
          </label>
          <input
            type="number"
            min={0}
            max={90}
            value={defaultLeadTimeDays}
            onChange={(e) => setDefaultLeadTimeDays(parseInt(e.target.value) || 0)}
            className="w-32 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-slate-400 mt-1">
            Usado no cálculo de prazo da OS quando uma peça deste fornecedor não está em estoque
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3 px-6 py-4 border-t bg-slate-50">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Salvando..." : supplier ? "Salvar" : "Criar Fornecedor"}
        </button>
      </div>
    </form>
  );
}
