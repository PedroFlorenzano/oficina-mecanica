"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface Service {
  id?: string;
  code?: string | null;
  description: string;
  category?: string | null;
  estimatedTime?: number | null;
  defaultPrice: number;
  pricingType?: string;
  commissionRate?: number | null;
  active: boolean;
}

interface Props {
  service: Service | null;
  onSaved: () => void;
  onCancel: () => void;
}

export default function ServiceForm({ service, onSaved, onCancel }: Props) {
  const [form, setForm] = useState({
    code: service?.code || "",
    description: service?.description || "",
    category: service?.category || "",
    estimatedTime: service?.estimatedTime?.toString() || "",
    defaultPrice: service?.defaultPrice?.toString() || "0",
    pricingType: service?.pricingType || "VALUE",
    commissionRate: service?.commissionRate?.toString() || "",
    active: service?.active ?? true,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const method = service?.id ? "PUT" : "POST";
    const url = service?.id ? `/api/services/${service.id}` : "/api/services";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erro ao salvar");
      setSaving(false);
      return;
    }

    onSaved();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-800">
          {service?.id ? "Editar Serviço" : "Novo Serviço"}
        </h2>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <X size={20} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Descrição *</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Código</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="Código personalizado"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Ex: Motor, Freios, Elétrica"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tempo Estimado (min)</label>
            <input
              type="number"
              value={form.estimatedTime}
              onChange={(e) => setForm({ ...form, estimatedTime: e.target.value })}
              min="0"
              placeholder="Ex: 60"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Preço Padrão (R$) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.defaultPrice}
              onChange={(e) => setForm({ ...form, defaultPrice: e.target.value })}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Precificação</label>
            <select
              value={form.pricingType}
              onChange={(e) => setForm({ ...form, pricingType: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="VALUE">Por Valor</option>
              <option value="TIME">Por Tempo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Comissão (%)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={form.commissionRate}
              onChange={(e) => setForm({ ...form, commissionRate: e.target.value })}
              placeholder="Usa taxa do mecânico"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">Vazio = usa taxa padrão do mecânico</p>
          </div>
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-slate-700">Ativo</span>
          </label>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {saving ? "Salvando..." : service?.id ? "Atualizar" : "Cadastrar"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-100 text-sm"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
