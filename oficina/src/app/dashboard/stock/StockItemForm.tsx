"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface StockItem {
  id?: string;
  code: string;
  barcode?: string | null;
  description: string;
  brand?: string | null;
  unit: string;
  minQuantity: number;
  quantity: number;
  location?: string | null;
  supplier?: string | null;
  costPrice: number;
  sellPrice: number;
  profitMargin?: number | null;
  active?: boolean;
}

interface Props {
  item: StockItem | null;
  onSaved: () => void;
  onCancel: () => void;
}

const UNITS = [
  { value: "PC", label: "PC - PEÇA" },
  { value: "UN", label: "UN - UNIDADE" },
  { value: "KIT", label: "KIT - KIT" },
  { value: "L", label: "L - LITRO" },
  { value: "ML", label: "ML - MILILITRO" },
  { value: "JG", label: "JG - JOGO" },
  { value: "M", label: "M - METRO" },
  { value: "KG", label: "KG - QUILOGRAMA" },
  { value: "CX", label: "CX - CAIXA" },
  { value: "PAR", label: "PAR - PAR" },
  { value: "BIS", label: "BIS - BISNAGA" },
  { value: "GL", label: "GL - GALÃO" },
  { value: "TB", label: "TB - TUBO" },
  { value: "RL", label: "RL - ROLO" },
];

export default function StockItemForm({ item, onSaved, onCancel }: Props) {
  const [form, setForm] = useState({
    code: item?.code || "",
    barcode: item?.barcode || "",
    description: item?.description || "",
    application: "",
    sku: "",
    originalCode: "",
    brand: item?.brand || "",
    unit: item?.unit || "UN",
    location: item?.location || "",
    supplier: item?.supplier || "",
    observations: "",
    minQuantity: item?.minQuantity?.toString() || "0",
    quantity: item?.quantity?.toString() || "0",
    costPrice: item?.costPrice?.toString() || "0",
    sellPrice: item?.sellPrice?.toString() || "0",
    profitMargin: item?.profitMargin?.toString() || "0",
    active: item?.active ?? true,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Auto-calculate sell price from cost + margin
  useEffect(() => {
    const cost = parseFloat(form.costPrice) || 0;
    const margin = parseFloat(form.profitMargin) || 0;
    if (cost > 0 && margin > 0) {
      const calculated = cost * (1 + margin / 100);
      setForm((f) => ({ ...f, sellPrice: calculated.toFixed(2) }));
    }
  }, [form.costPrice, form.profitMargin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const method = item?.id ? "PUT" : "POST";
    const url = item?.id ? `/api/stock/${item.id}` : "/api/stock";

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
          {item?.id ? "Editar Produto" : "Cadastro de Produto"}
        </h2>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Layout: two columns like Syscar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_250px] gap-6">
          {/* Left column - Informações */}
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-bold text-red-600 uppercase mb-3">Informações</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Código Personalizado/Referência</label>
                    <input type="text" value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      placeholder="Auto-gerado se vazio"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Código de Barras</label>
                    <input type="text" value={form.barcode}
                      onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Descrição do Produto *</label>
                  <input type="text" value={form.description} required
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-amber-50" />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Aplicação do Produto</label>
                  <textarea value={form.application} rows={2}
                    onChange={(e) => setForm({ ...form, application: e.target.value })}
                    placeholder="Veículos compatíveis, uso recomendado..."
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Localização</label>
                    <input type="text" value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="Ex: Prateleira A3"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">SKU</label>
                    <input type="text" value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Código Original / Similaridade</label>
                    <input type="text" value={form.originalCode}
                      onChange={(e) => setForm({ ...form, originalCode: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Marca</label>
                    <input type="text" value={form.brand}
                      onChange={(e) => setForm({ ...form, brand: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fornecedor Padrão</label>
                  <input type="text" value={form.supplier}
                    onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                    placeholder="Ex: Auto Peças Silva, Bosch, etc."
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            {/* Unidade */}
            <div>
              <h3 className="text-sm font-bold text-red-600 uppercase mb-3">Unidade</h3>
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>

            {/* Observações */}
            <div>
              <h3 className="text-sm font-bold text-red-600 uppercase mb-3">Observações</h3>
              <textarea value={form.observations} rows={3}
                onChange={(e) => setForm({ ...form, observations: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Right column - Status, Preços, Estoque */}
          <div className="space-y-5">
            {/* Ativo p/ Venda */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h3 className="text-sm font-bold text-red-600 uppercase mb-3">Ativo P/ Venda</h3>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="active" checked={form.active}
                    onChange={() => setForm({ ...form, active: true })}
                    className="w-4 h-4 text-blue-600" />
                  <span className="text-sm">SIM</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="active" checked={!form.active}
                    onChange={() => setForm({ ...form, active: false })}
                    className="w-4 h-4 text-blue-600" />
                  <span className="text-sm">NÃO</span>
                </label>
              </div>
            </div>

            {/* Valor de Venda */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h3 className="text-sm font-bold text-red-600 uppercase mb-3">Valor de Venda</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">R$ Custo</label>
                  <input type="number" step="0.01" min="0" value={form.costPrice}
                    onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">R$ Custo Médio</label>
                  <input type="text" readOnly value={`R$ ${(parseFloat(form.costPrice) || 0).toFixed(2)}`}
                    className="w-full px-3 py-2 border border-slate-200 rounded text-sm bg-amber-50 text-slate-600" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Margem de Lucro (%)</label>
                  <div className="flex items-center gap-1">
                    <input type="number" step="0.1" min="0" value={form.profitMargin}
                      onChange={(e) => setForm({ ...form, profitMargin: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <span className="text-red-600 font-bold text-sm">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">R$ Venda</label>
                  <input type="number" step="0.01" min="0" value={form.sellPrice}
                    onChange={(e) => setForm({ ...form, sellPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            {/* Estoque */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h3 className="text-sm font-bold text-red-600 uppercase mb-3">Estoque</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Quantidade</label>
                  <input type="number" min="0" value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-amber-50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Qtd Mínima (alerta)</label>
                  <input type="number" min="0" value={form.minQuantity}
                    onChange={(e) => setForm({ ...form, minQuantity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-4 border-t">
          <button type="submit" disabled={saving}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
            {saving ? "Salvando..." : item?.id ? "Atualizar" : "Cadastrar"}
          </button>
          <button type="button" onClick={onCancel}
            className="px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-100 text-sm">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
