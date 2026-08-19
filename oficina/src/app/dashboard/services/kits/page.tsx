"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, Package, Wrench } from "lucide-react";
import Link from "next/link";
import { PageHeader, Card, Button, Combobox } from "@/components/ui";
import type { ComboboxOption } from "@/components/ui";

interface KitItem {
  id?: string;
  type: "SERVICE" | "PART";
  description: string;
  serviceId?: string | null;
  price: number;
  timeMinutes: number;
  stockItemId?: string | null;
  quantity: number;
  unitPrice: number;
}

interface Kit {
  id: string;
  name: string;
  description: string | null;
  items: KitItem[];
}

export default function KitsPage() {
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKit, setEditingKit] = useState<Kit | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchKits = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/kits");
      if (res.ok) setKits(await res.json());
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchKits(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este kit?")) return;
    const res = await fetch(`/api/kits/${id}`, { method: "DELETE" });
    if (res.ok) fetchKits();
  };

  if (showForm) {
    return (
      <KitFormModal
        kit={editingKit}
        onClose={() => setShowForm(false)}
        onSaved={() => { setShowForm(false); fetchKits(); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kits de Serviço"
        description="Conjuntos pré-definidos de serviços + peças para uso rápido na OS"
        action={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/services" className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700">
              ← Catálogo
            </Link>
            <Button onClick={() => { setEditingKit(null); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Novo Kit
            </Button>
          </div>
        }
      />

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : kits.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">Nenhum kit cadastrado.</p>
          <p className="text-sm text-slate-400 mt-1">Crie kits com serviços e peças frequentes para agilizar a criação de OS.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {kits.map((kit) => (
            <Card key={kit.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-800">{kit.name}</h3>
                  {kit.description && <p className="text-sm text-slate-500 mt-0.5">{kit.description}</p>}
                  <div className="flex gap-4 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Wrench size={12} /> {kit.items.filter(i => i.type === "SERVICE").length} serviço(s)
                    </span>
                    <span className="flex items-center gap-1">
                      <Package size={12} /> {kit.items.filter(i => i.type === "PART").length} peça(s)
                    </span>
                  </div>
                  {kit.items.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {kit.items.map((item, i) => (
                        <div key={i} className="text-xs text-slate-600 flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${item.type === "SERVICE" ? "bg-blue-400" : "bg-green-400"}`} />
                          {item.description}
                          {item.type === "SERVICE" && item.price > 0 && (
                            <span className="text-slate-400">R$ {item.price.toFixed(2)}</span>
                          )}
                          {item.type === "PART" && (
                            <span className="text-slate-400">×{item.quantity}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditingKit(kit); setShowForm(true); }} className="p-1.5 rounded hover:bg-yellow-50 text-yellow-600" title="Editar">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(kit.id)} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Excluir">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <KitFormModal
          kit={editingKit}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchKits(); }}
        />
      )}
    </div>
  );
}

// ============================================
// Kit Form Modal
// ============================================

function KitFormModal({ kit, onClose, onSaved }: { kit: Kit | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(kit?.name || "");
  const [description, setDescription] = useState(kit?.description || "");
  const [items, setItems] = useState<KitItem[]>(kit?.items || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [catalogServices, setCatalogServices] = useState<Array<{ id: string; description: string; defaultPrice: number; estimatedTime: number | null }>>([]);
  const [stockItems, setStockItems] = useState<Array<{ id: string; code: string; description: string; brand: string | null; sellPrice: number }>>([]);

  useEffect(() => {
    fetch("/api/services").then(r => r.ok ? r.json() : []).then(setCatalogServices).catch(() => {});
    fetch("/api/stock").then(r => r.ok ? r.json() : []).then(setStockItems).catch(() => {});
  }, []);

  const addItem = (type: "SERVICE" | "PART") => {
    setItems([...items, { type, description: "", price: 0, timeMinutes: 0, quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, updates: Partial<KitItem>) => {
    const u = [...items];
    u[idx] = { ...u[idx], ...updates };
    setItems(u);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Nome é obrigatório"); return; }
    if (items.length === 0) { setError("Adicione ao menos um item ao kit"); return; }

    setSaving(true);
    setError("");

    const method = kit?.id ? "PUT" : "POST";
    const url = kit?.id ? `/api/kits/${kit.id}` : "/api/kits";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, items }),
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
    <div className="space-y-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 border-b pb-4">
          <h2 className="text-xl font-bold text-slate-800">{kit ? "Editar Kit" : "Novo Kit"}</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">
            ✕ Fechar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Kit *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Troca de Óleo" required
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição opcional"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Itens */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800">Itens do Kit</h3>
              <div className="flex gap-3">
                <button type="button" onClick={() => addItem("SERVICE")}
                  className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 flex items-center gap-1">
                  <Wrench size={12} /> + Serviço
                </button>
                <button type="button" onClick={() => addItem("PART")}
                  className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 flex items-center gap-1">
                  <Package size={12} /> + Peça
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
                <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">Nenhum item adicionado.</p>
                <p className="text-xs text-slate-400 mt-1">Clique em &quot;+ Serviço&quot; ou &quot;+ Peça&quot; acima.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, i) => (
                  <div key={i} className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${item.type === "SERVICE" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                        {item.type === "SERVICE" ? "SERVIÇO" : "PEÇA"}
                      </span>
                      <span className="flex-1 text-sm text-slate-600 font-medium">
                        {item.description || "(selecione abaixo)"}
                      </span>
                      <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {item.type === "SERVICE" ? (
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_100px] gap-3">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Serviço</label>
                          <Combobox
                            options={catalogServices.map(s => ({ id: s.id, label: s.description, rightLabel: `R$ ${s.defaultPrice.toFixed(2)}` }))}
                            value={item.description}
                            onChange={(val) => updateItem(i, { description: val })}
                            onSelect={(opt) => {
                              const svc = catalogServices.find(s => s.id === opt.id);
                              if (svc) {
                                updateItem(i, { description: svc.description, serviceId: svc.id, price: svc.defaultPrice, timeMinutes: svc.estimatedTime || 0 });
                              }
                            }}
                            placeholder="Buscar serviço..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Preço (R$)</label>
                          <input type="number" step="0.01" value={item.price || ""}
                            onChange={(e) => updateItem(i, { price: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Tempo (h)</label>
                          <input type="number" step="0.5" min="0" value={item.timeMinutes > 0 ? item.timeMinutes / 60 : ""}
                            onChange={(e) => updateItem(i, { timeMinutes: Math.round(Number(e.target.value) * 60) })}
                            placeholder="1.5"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_80px_120px] gap-3">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Peça / Produto</label>
                          <Combobox
                            options={stockItems.map(s => ({ id: s.id, label: s.description, sublabel: s.code, rightLabel: `R$ ${s.sellPrice.toFixed(2)}` }))}
                            value={item.description}
                            onChange={(val) => updateItem(i, { description: val })}
                            onSelect={(opt) => {
                              const st = stockItems.find(s => s.id === opt.id);
                              if (st) {
                                updateItem(i, { description: st.description, stockItemId: st.id, unitPrice: st.sellPrice });
                              }
                            }}
                            placeholder="Buscar peça..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Qtd</label>
                          <input type="number" min="1" value={item.quantity || ""}
                            onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">R$ Unitário</label>
                          <input type="number" step="0.01" value={item.unitPrice || ""}
                            onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
              {saving ? "Salvando..." : kit ? "Atualizar Kit" : "Criar Kit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
