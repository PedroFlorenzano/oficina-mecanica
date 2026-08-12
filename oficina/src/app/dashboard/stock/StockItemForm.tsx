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
  supplierId?: string | null;
  leadTimeDays?: number | null;
  costPrice: number;
  sellPrice: number;
  profitMargin?: number | null;
  active?: boolean;
  // Tributários
  ncm?: string | null;
  cfop?: string | null;
  cstA?: string | null;
  csosn?: string | null;
  cstB?: string | null;
  productUse?: string | null;
}

interface SupplierOption {
  id: string;
  name: string;
  defaultLeadTimeDays: number;
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
    supplierId: item?.supplierId || "",
    leadTimeDays: item?.leadTimeDays?.toString() || "",
    observations: "",
    minQuantity: item?.minQuantity?.toString() || "0",
    quantity: item?.quantity?.toString() || "0",
    costPrice: item?.costPrice?.toString() || "0",
    sellPrice: item?.sellPrice?.toString() || "0",
    profitMargin: item?.profitMargin?.toString() || "0",
    active: item?.active ?? true,
    // Tributários
    ncm: item?.ncm || "",
    cfop: item?.cfop || "",
    cstA: item?.cstA || "",
    csosn: item?.csosn || "",
    cstB: item?.cstB || "",
    productUse: item?.productUse || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);

  // Buscar fornecedores cadastrados
  useEffect(() => {
    fetch("/api/suppliers")
      .then((r) => r.ok ? r.json() : [])
      .then((data: SupplierOption[]) => setSuppliers(data))
      .catch(() => {});
  }, []);

  // Auto-calculate sell price from cost + margin
  useEffect(() => {
    const cost = parseFloat(form.costPrice) || 0;
    const margin = parseFloat(form.profitMargin) || 0;
    if (cost > 0 && margin > 0) {
      const calculated = cost * (1 + margin / 100);
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fornecedor</label>
                  <select value={form.supplierId}
                    onChange={(e) => {
                      const selected = suppliers.find(s => s.id === e.target.value);
                      setForm({ ...form, supplierId: e.target.value, supplier: selected?.name || "" });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Selecione um fornecedor...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.defaultLeadTimeDays}d)</option>
                    ))}
                  </select>
                  {!form.supplierId && (
                    <input type="text" value={form.supplier}
                      onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                      placeholder="Ou digite manualmente"
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-500" />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Prazo de entrega (dias úteis)
                  </label>
                  <input type="number" min="0" max="90" value={form.leadTimeDays}
                    onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })}
                    placeholder={form.supplierId ? `Padrão: ${suppliers.find(s => s.id === form.supplierId)?.defaultLeadTimeDays || 3}d` : "Usar padrão"}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <p className="text-xs text-slate-400 mt-0.5">Deixe vazio para usar o prazo padrão do fornecedor</p>
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

            {/* Dados Tributários para Nota Fiscal */}
            <div>
              <h3 className="text-sm font-bold text-red-600 uppercase mb-3">Dados Tributários (NF-e)</h3>
              <div className="space-y-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">NCM</label>
                    <input type="text" maxLength={8} value={form.ncm}
                      onChange={(e) => setForm({ ...form, ncm: e.target.value.replace(/\D/g, "").slice(0, 8) })}
                      placeholder="Ex: 84212300"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">CFOP</label>
                    <input type="text" maxLength={4} value={form.cfop}
                      onChange={(e) => setForm({ ...form, cfop: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                      placeholder="Ex: 5405"
                      className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Origem / CST A</label>
                  <select value={form.cstA} onChange={(e) => setForm({ ...form, cstA: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Selecione...</option>
                    <option value="0">0 - Nacional</option>
                    <option value="1">1 - Estrangeira - Importação direta</option>
                    <option value="2">2 - Estrangeira - Adquirida no mercado interno</option>
                    <option value="3">3 - Nacional com conteúdo de importação superior a 40%</option>
                    <option value="4">4 - Nacional (processos produtivos básicos)</option>
                    <option value="5">5 - Nacional com conteúdo de importação inferior a 40%</option>
                    <option value="6">6 - Estrangeira - Importação direta (sem similar nacional)</option>
                    <option value="7">7 - Estrangeira - Adquirida no mercado interno (sem similar nacional)</option>
                    <option value="8">8 - Nacional com conteúdo de importação superior a 70%</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Finalidade</label>
                  <select value={form.productUse} onChange={(e) => setForm({ ...form, productUse: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Selecione...</option>
                    <option value="REVENDA">Mercadoria para Revenda</option>
                    <option value="CONSUMO">Material de Uso e Consumo</option>
                    <option value="INDUSTRIALIZACAO">Industrialização</option>
                    <option value="ATIVO">Ativo Imobilizado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">CSOSN (Simples Nacional)</label>
                  <select value={form.csosn} onChange={(e) => setForm({ ...form, csosn: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Selecione...</option>
                    <option value="101">101 - Tributada com permissão de crédito</option>
                    <option value="102">102 - Tributada sem permissão de crédito</option>
                    <option value="103">103 - Isenção do ICMS para faixa de receita bruta</option>
                    <option value="201">201 - Tributada com permissão de crédito e com ST</option>
                    <option value="202">202 - Tributada sem permissão de crédito e com ST</option>
                    <option value="203">203 - Isenção do ICMS para faixa de receita bruta e com ST</option>
                    <option value="300">300 - Imune</option>
                    <option value="400">400 - Não tributada</option>
                    <option value="500">500 - ICMS cobrado anteriormente por ST ou antecipação</option>
                    <option value="900">900 - Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">CST B (ICMS Regime Normal)</label>
                  <select value={form.cstB} onChange={(e) => setForm({ ...form, cstB: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Selecione...</option>
                    <option value="00">00 - Tributada integralmente</option>
                    <option value="10">10 - Tributada com cobrança de ICMS por ST</option>
                    <option value="20">20 - Com redução de base de cálculo</option>
                    <option value="30">30 - Isenta/não tributada com cobrança de ICMS por ST</option>
                    <option value="40">40 - Isenta</option>
                    <option value="41">41 - Não tributada</option>
                    <option value="50">50 - Suspensão</option>
                    <option value="51">51 - Diferimento</option>
                    <option value="60">60 - ICMS cobrado anteriormente por ST</option>
                    <option value="70">70 - Com redução de BC e cobrança de ICMS por ST</option>
                    <option value="90">90 - Outros</option>
                  </select>
                </div>
              </div>
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
