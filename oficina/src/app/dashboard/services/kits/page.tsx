"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, Package, Wrench } from "lucide-react";
import Link from "next/link";
import { PageHeader, Card, Button, Input, Modal } from "@/components/ui";

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
    <Modal title={kit ? "Editar Kit" : "Novo Kit"} onClose={onClose} size="lg" isOpen={true}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nome do Kit *" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Troca de Óleo" required />
          <Input label="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição opcional" />
        </div>

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-slate-700">Itens do Kit</h4>
            <div className="flex gap-2">
              <button type="button" onClick={() => addItem("SERVICE")} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <Wrench size={12} /> + Serviço
              </button>
              <button type="button" onClick={() => addItem("PART")} className="text-xs text-green-600 hover:underline flex items-center gap-1">
                <Package size={12} /> + Peça
              </button>
            </div>
          </div>

          {items.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">Nenhum item adicionado. Clique em &quot;+ Serviço&quot; ou &quot;+ Peça&quot; acima.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50">
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${item.type === "SERVICE" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                    {item.type === "SERVICE" ? "SVC" : "PÇ"}
                  </span>
                  {item.type === "SERVICE" ? (
                    <>
                      <select
                        value={item.serviceId || ""}
                        onChange={(e) => {
                          const svc = catalogServices.find(s => s.id === e.target.value);
                          if (svc) {
                            updateItem(i, { description: svc.description, serviceId: svc.id, price: svc.defaultPrice, timeMinutes: svc.estimatedTime || 0 });
                          }
                        }}
                        className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-sm"
                      >
                        <option value="">Selecionar serviço...</option>
                        {catalogServices.map(s => (
                          <option key={s.id} value={s.id}>{s.description}</option>
                        ))}
                      </select>
                      <input type="number" step="0.01" value={item.price || ""}
                        onChange={(e) => updateItem(i, { price: Number(e.target.value) })}
                        placeholder="R$" className="w-20 px-2 py-1.5 border border-slate-300 rounded text-sm" />
                      <input type="number" value={item.timeMinutes || ""}
                        onChange={(e) => updateItem(i, { timeMinutes: Number(e.target.value) })}
                        placeholder="Min" className="w-16 px-2 py-1.5 border border-slate-300 rounded text-sm" />
                    </>
                  ) : (
                    <>
                      <select
                        value={item.stockItemId || ""}
                        onChange={(e) => {
                          const st = stockItems.find(s => s.id === e.target.value);
                          if (st) {
                            updateItem(i, { description: st.description, stockItemId: st.id, unitPrice: st.sellPrice });
                          }
                        }}
                        className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-sm"
                      >
                        <option value="">Selecionar peça...</option>
                        {stockItems.map(s => (
                          <option key={s.id} value={s.id}>{s.description} ({s.code})</option>
                        ))}
                      </select>
                      <input type="number" min="1" value={item.quantity || ""}
                        onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })}
                        placeholder="Qtd" className="w-14 px-2 py-1.5 border border-slate-300 rounded text-sm" />
                      <input type="number" step="0.01" value={item.unitPrice || ""}
                        onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) })}
                        placeholder="R$ Unit" className="w-20 px-2 py-1.5 border border-slate-300 rounded text-sm" />
                    </>
                  )}
                  <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? "Salvando..." : kit ? "Atualizar" : "Criar Kit"}</Button>
        </div>
      </form>
    </Modal>
  );
}
