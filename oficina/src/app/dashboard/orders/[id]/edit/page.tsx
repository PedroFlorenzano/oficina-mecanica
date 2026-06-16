"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft, ChevronDown, ChevronUp, ListChecks } from "lucide-react";
import Link from "next/link";
import { Combobox, ComboboxOption, MultiSelectModal } from "@/components/ui";
import type { MultiSelectItem } from "@/components/ui";
import { formatCurrency } from "@/lib/format";

interface CatalogService {
  id: string;
  description: string;
  category: string | null;
  estimatedTime: number | null;
  defaultPrice: number;
}

interface StockItem {
  id: string;
  code: string;
  description: string;
  brand: string | null;
  unit: string;
  quantity: number;
  sellPrice: number;
}

interface ServiceItem {
  description: string;
  price: number;
  timeMinutes: number;
  serviceId?: string;
}

interface PartItem {
  description: string;
  brand: string;
  quantity: number;
  unitPrice: number;
  stockItemId?: string;
}

interface ComplaintItem {
  description: string;
  services: ServiceItem[];
  parts: PartItem[];
  expanded: boolean;
}

interface OrderData {
  id: string;
  number: number;
  status: string;
  notes: string | null;
  client: { name: string };
  vehicle: { plate: string; brand: string; model: string };
  complaints: {
    description: string;
    services: { description: string; price: number; timeMinutes?: number | null; serviceId?: string | null; mechanicId?: string | null }[];
    parts: { description: string; quantity: number; unitPrice: number; totalPrice: number; stockItemId?: string | null; stockItem?: { brand?: string | null } | null }[];
  }[];
}

export default function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [order, setOrder] = useState<OrderData | null>(null);
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [catalogServices, setCatalogServices] = useState<CatalogService[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [showServiceModal, setShowServiceModal] = useState<number | null>(null);
  const [showPartModal, setShowPartModal] = useState<number | null>(null);

  // Carregar dados da OS + catálogos
  useEffect(() => {
    Promise.all([
      fetch(`/api/orders/${id}`).then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch("/api/services").then((r) => { if (!r.ok) return []; return r.json(); }),
      fetch("/api/stock").then((r) => { if (!r.ok) return []; return r.json(); }),
    ]).then(([orderData, services, stock]) => {
      setOrder(orderData);
      setCatalogServices(services);
      setStockItems(stock);
      setNotes(orderData.notes || "");

      // Preencher formulário com dados atuais
      setComplaints(
        orderData.complaints.map((c: OrderData["complaints"][number]) => ({
          description: c.description,
          services: c.services.map((s: OrderData["complaints"][number]["services"][number]) => ({
            description: s.description,
            price: s.price,
            timeMinutes: s.timeMinutes || 0,
            serviceId: s.serviceId || undefined,
          })),
          parts: c.parts.map((p: OrderData["complaints"][number]["parts"][number]) => ({
            description: p.description,
            brand: p.stockItem?.brand || "",
            quantity: p.quantity,
            unitPrice: p.unitPrice,
            stockItemId: p.stockItemId || undefined,
          })),
          expanded: true,
        }))
      );
    }).catch(() => {
      setError("Erro ao carregar OS");
    }).finally(() => setLoading(false));
  }, [id]);

  const serviceOptions: ComboboxOption[] = catalogServices.map((s) => ({
    id: s.id,
    label: s.description,
    sublabel: s.category || "",
    rightLabel: formatCurrency(s.defaultPrice),
  }));

  const partOptions: ComboboxOption[] = stockItems.map((item) => ({
    id: item.id,
    label: item.description,
    sublabel: `${item.code} • ${item.brand || ""}`,
    rightLabel: formatCurrency(item.sellPrice),
    rightSublabel: `Estoque: ${item.quantity}`,
  }));

  const serviceModalItems: MultiSelectItem[] = catalogServices.map((s) => ({
    id: s.id,
    label: s.description,
    sublabel: s.category || undefined,
    rightLabel: formatCurrency(s.defaultPrice),
  }));

  const partModalItems: MultiSelectItem[] = stockItems.map((item) => ({
    id: item.id,
    label: item.description,
    sublabel: `${item.code} • ${item.brand || ""}`,
    rightLabel: formatCurrency(item.sellPrice),
  }));

  const addMultipleServices = (ci: number, ids: string[]) => {
    const u = [...complaints];
    const newServices = ids.map((id) => {
      const svc = catalogServices.find((s) => s.id === id)!;
      return { description: svc.description, price: svc.defaultPrice, timeMinutes: svc.estimatedTime || 0, serviceId: svc.id };
    });
    if (u[ci].services.length === 1 && !u[ci].services[0].description) {
      u[ci].services = newServices;
    } else {
      u[ci].services.push(...newServices);
    }
    setComplaints(u);
    setShowServiceModal(null);
  };

  const addMultipleParts = (ci: number, ids: string[]) => {
    const u = [...complaints];
    const newParts = ids.map((id) => {
      const item = stockItems.find((s) => s.id === id)!;
      return { description: item.description, brand: item.brand || "", quantity: 1, unitPrice: item.sellPrice, stockItemId: item.id };
    });
    u[ci].parts.push(...newParts);
    setComplaints(u);
    setShowPartModal(null);
  };

  const getComplaintTotal = (c: ComplaintItem) => {
    const svcTotal = c.services.reduce((sum, s) => sum + (s.price || 0), 0);
    const prtTotal = c.parts.reduce((sum, p) => sum + (p.quantity || 0) * (p.unitPrice || 0), 0);
    return svcTotal + prtTotal;
  };

  const totalGeral = complaints.reduce((sum, c) => sum + getComplaintTotal(c), 0);

  const toggleComplaint = (idx: number) => {
    const updated = [...complaints];
    updated[idx].expanded = !updated[idx].expanded;
    setComplaints(updated);
  };

  const addComplaint = () => {
    setComplaints([...complaints, { description: "", services: [{ description: "", price: 0, timeMinutes: 0 }], parts: [], expanded: true }]);
  };

  const removeComplaint = (idx: number) => {
    if (complaints.length <= 1) return;
    setComplaints(complaints.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validComplaints = complaints.filter(c => c.description.trim());
    if (validComplaints.length === 0) { setError("Adicione ao menos uma reclamação com descrição"); return; }
    if (!validComplaints.some(c => c.services.some(s => s.description && s.price > 0))) {
      setError("Adicione ao menos um serviço em alguma reclamação"); return;
    }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes,
        complaints: validComplaints.map(c => ({
          description: c.description,
          services: c.services.filter(s => s.description).map(s => ({
            description: s.description,
            price: s.price,
            timeMinutes: s.timeMinutes,
            serviceId: s.serviceId,
          })),
          parts: c.parts.filter(p => p.description).map(p => ({
            description: p.description,
            quantity: p.quantity,
            unitPrice: p.unitPrice,
            stockItemId: p.stockItemId,
          })),
        })),
      }),
    });
    if (!res.ok) { const data = await res.json(); setError(data.error || "Erro ao salvar OS"); setSaving(false); return; }
    router.replace(`/dashboard/orders/${id}`);
  };

  if (loading) return <div className="p-6 text-slate-500">Carregando...</div>;
  if (!order) return <div className="p-6 text-red-600">OS não encontrada</div>;
  if (order.status !== "WAITING_APPROVAL") {
    return (
      <div className="p-6">
        <p className="text-red-600 mb-4">Esta OS não pode ser editada (status: {order.status})</p>
        <Link href={`/dashboard/orders/${id}`} className="text-blue-600 hover:underline">← Voltar</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/dashboard/orders/${id}`} className="text-slate-400 hover:text-slate-600"><ArrowLeft size={20} /></Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Editar Orçamento — OS #{order.number}</h1>
          <p className="text-sm text-slate-500">{order.client.name} • {order.vehicle.plate} {order.vehicle.brand} {order.vehicle.model}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Observações */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h2 className="font-bold text-slate-800 mb-3 border-b pb-2">OBSERVAÇÕES</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Observações da OS..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px]"
          />
        </div>

        {/* RECLAMAÇÕES */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">RECLAMAÇÕES DO CLIENTE</h2>
            <button type="button" onClick={addComplaint}
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-1">
              <Plus size={14} /> Adicionar Reclamação
            </button>
          </div>

          {complaints.map((complaint, ci) => (
            <div key={ci} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-visible">
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200 cursor-pointer rounded-t-xl"
                onClick={() => toggleComplaint(ci)}
              >
                <div className="flex items-center gap-3">
                  {complaint.expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                  <span className="font-bold text-slate-700">Reclamação #{ci + 1}</span>
                  {complaint.description && <span className="text-sm text-slate-500">— {complaint.description}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-green-700">{formatCurrency(getComplaintTotal(complaint))}</span>
                  {complaints.length > 1 && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeComplaint(ci); }} className="text-red-400 hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              {complaint.expanded && (
                <div className="p-5 space-y-4">
                  {/* Descrição */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">DESCRIÇÃO DA RECLAMAÇÃO *</label>
                    <input type="text" value={complaint.description}
                      onChange={(e) => { const u = [...complaints]; u[ci].description = e.target.value; setComplaints(u); }}
                      placeholder="Ex: Barulho na suspensão"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  {/* Serviços */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-slate-700">Serviços</h3>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setShowServiceModal(ci)}
                          className="text-blue-600 text-xs flex items-center gap-1 hover:text-blue-800"><ListChecks size={12} /> Adicionar Vários</button>
                        <button type="button" onClick={() => { const u = [...complaints]; u[ci].services.push({ description: "", price: 0, timeMinutes: 0 }); setComplaints(u); }}
                          className="text-blue-600 text-xs flex items-center gap-1 hover:text-blue-800"><Plus size={12} /> Adicionar</button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {complaint.services.map((s, si) => (
                        <div key={si} className="grid grid-cols-[1fr_100px_80px_30px] gap-2 items-end">
                          <Combobox
                            options={serviceOptions}
                            value={s.description}
                            onChange={(val) => {
                              const u = [...complaints];
                              u[ci].services[si] = { ...u[ci].services[si], description: val, serviceId: undefined };
                              setComplaints(u);
                            }}
                            onSelect={(opt) => {
                              const svc = catalogServices.find(sv => sv.id === opt.id);
                              if (svc) {
                                const u = [...complaints];
                                u[ci].services[si] = { description: svc.description, price: svc.defaultPrice, timeMinutes: svc.estimatedTime || 0, serviceId: svc.id };
                                setComplaints(u);
                              }
                            }}
                            placeholder="Buscar serviço..."
                          />
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Preço (R$)</label>
                            <input type="number" value={s.price || ""} step="0.01"
                              onChange={(e) => { const u = [...complaints]; u[ci].services[si].price = Number(e.target.value); setComplaints(u); }}
                              className="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Tempo</label>
                            <input type="number" value={s.timeMinutes || ""}
                              onChange={(e) => { const u = [...complaints]; u[ci].services[si].timeMinutes = Number(e.target.value); setComplaints(u); }}
                              className="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          </div>
                          {complaint.services.length > 1 && (
                            <button type="button" onClick={() => { const u = [...complaints]; u[ci].services = u[ci].services.filter((_, idx) => idx !== si); setComplaints(u); }}
                              className="text-red-400 hover:text-red-600 pb-1"><Trash2 size={14} /></button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Peças */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-slate-700">Peças</h3>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setShowPartModal(ci)}
                          className="text-blue-600 text-xs flex items-center gap-1 hover:text-blue-800"><ListChecks size={12} /> Adicionar Várias</button>
                        <button type="button" onClick={() => { const u = [...complaints]; u[ci].parts.push({ description: "", brand: "", quantity: 1, unitPrice: 0 }); setComplaints(u); }}
                          className="text-blue-600 text-xs flex items-center gap-1 hover:text-blue-800"><Plus size={12} /> Adicionar</button>
                      </div>
                    </div>
                    {complaint.parts.length === 0 ? (
                      <p className="text-slate-400 text-xs">Nenhuma peça adicionada</p>
                    ) : (
                      <div className="space-y-2">
                        {complaint.parts.map((p, pi) => (
                          <div key={pi} className="grid grid-cols-[1fr_80px_60px_90px_30px] gap-2 items-end">
                            <Combobox
                              options={partOptions}
                              value={p.description}
                              onChange={(val) => {
                                const u = [...complaints];
                                u[ci].parts[pi] = { ...u[ci].parts[pi], description: val, stockItemId: undefined };
                                setComplaints(u);
                              }}
                              onSelect={(opt) => {
                                const item = stockItems.find(st => st.id === opt.id);
                                if (item) {
                                  const u = [...complaints];
                                  u[ci].parts[pi] = { description: item.description, brand: item.brand || "", quantity: u[ci].parts[pi].quantity || 1, unitPrice: item.sellPrice, stockItemId: item.id };
                                  setComplaints(u);
                                }
                              }}
                              placeholder="Buscar peça..."
                            />
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Marca</label>
                              <input type="text" value={p.brand}
                                onChange={(e) => { const u = [...complaints]; u[ci].parts[pi].brand = e.target.value; setComplaints(u); }}
                                className="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Qtd</label>
                              <input type="number" value={p.quantity || ""}
                                onChange={(e) => { const u = [...complaints]; u[ci].parts[pi].quantity = Number(e.target.value); setComplaints(u); }}
                                className="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">R$ Unit</label>
                              <input type="number" value={p.unitPrice || ""} step="0.01"
                                onChange={(e) => { const u = [...complaints]; u[ci].parts[pi].unitPrice = Number(e.target.value); setComplaints(u); }}
                                className="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm" />
                            </div>
                            <button type="button" onClick={() => { const u = [...complaints]; u[ci].parts = u[ci].parts.filter((_, idx) => idx !== pi); setComplaints(u); }}
                              className="text-red-400 hover:text-red-600 pb-1"><Trash2 size={14} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Subtotal */}
                  <div className="text-right pt-3 border-t border-slate-200">
                    <span className="text-sm font-bold text-slate-700">Subtotal: {formatCurrency(getComplaintTotal(complaint))}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* TOTAL */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-slate-300 p-5">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-slate-800">TOTAL GERAL</span>
            <span className="text-2xl font-bold text-green-600">{formatCurrency(totalGeral)}</span>
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm">
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
          <Link href={`/dashboard/orders/${id}`}
            className="px-6 py-3 border border-slate-300 rounded-lg hover:bg-slate-100 text-sm font-medium flex items-center">
            Cancelar
          </Link>
        </div>
      </form>

      {/* Modais de seleção múltipla */}
      {showServiceModal !== null && (
        <MultiSelectModal
          title="Selecionar Serviços"
          items={serviceModalItems}
          excludeIds={complaints[showServiceModal].services.filter((s) => s.serviceId).map((s) => s.serviceId!)}
          onConfirm={(ids) => addMultipleServices(showServiceModal, ids)}
          onClose={() => setShowServiceModal(null)}
        />
      )}
      {showPartModal !== null && (
        <MultiSelectModal
          title="Selecionar Peças"
          items={partModalItems}
          excludeIds={complaints[showPartModal].parts.filter((p) => p.stockItemId).map((p) => p.stockItemId!)}
          onConfirm={(ids) => addMultipleParts(showPartModal, ids)}
          onClose={() => setShowPartModal(null)}
        />
      )}
    </div>
  );
}
