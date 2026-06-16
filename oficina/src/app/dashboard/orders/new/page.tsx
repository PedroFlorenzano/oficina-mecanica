"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft, ChevronDown, ChevronUp, ListChecks } from "lucide-react";
import Link from "next/link";
import { Combobox, ComboboxOption, MultiSelectModal } from "@/components/ui";
import type { MultiSelectItem } from "@/components/ui";
import { formatCurrency } from "@/lib/format";

interface Client {
  id: string;
  name: string;
  document: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  vehicles: { id: string; plate: string; brand: string; model: string; year: number; color: string | null; mileage: number }[];
}

interface CatalogService {
  id: string;
  description: string;
  category: string | null;
  estimatedTime: number | null;
  defaultPrice: number;
  commissionRate: number | null;
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
  commissionRate?: number | null;
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

export default function NewOrderPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [vehicleId, setVehicleId] = useState("");
  const [mileageIn, setMileageIn] = useState(0);
  const [complaints, setComplaints] = useState<ComplaintItem[]>([
    { description: "", services: [{ description: "", price: 0, timeMinutes: 0 }], parts: [], expanded: true },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [clientSearch, setClientSearch] = useState("");
  const [catalogServices, setCatalogServices] = useState<CatalogService[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const clientAbortRef = useRef<AbortController | null>(null);

  // Multi-select modal states
  const [showServiceModal, setShowServiceModal] = useState<number | null>(null);
  const [showPartModal, setShowPartModal] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/services").then((r) => { if (!r.ok) return []; return r.json(); }).then(setCatalogServices).catch(() => {});
    fetch("/api/stock").then((r) => { if (!r.ok) return []; return r.json(); }).then(setStockItems).catch(() => {});
  }, []);

  useEffect(() => {
    clientAbortRef.current?.abort();
    const controller = new AbortController();
    clientAbortRef.current = controller;

    const url = clientSearch.length >= 2
      ? `/api/clients?search=${encodeURIComponent(clientSearch)}`
      : clientSearch.length === 0 && !selectedClient
        ? "/api/clients"
        : null;

    if (url) {
      fetch(url, { signal: controller.signal })
        .then((res) => { if (!res.ok) return []; return res.json(); })
        .then(setClients)
        .catch(() => {});
    }

    return () => controller.abort();
  }, [clientSearch, selectedClient]);

  const selectClient = (client: Client) => {
    setSelectedClient(client);
    setClientSearch(client.name);
    setVehicleId("");
  };

  const clientOptions: ComboboxOption[] = clients.map((c) => ({
    id: c.id,
    label: c.name,
    sublabel: `${c.document} • ${c.phone || ""}`,
  }));

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
      return { description: svc.description, price: svc.defaultPrice, timeMinutes: svc.estimatedTime || 0, serviceId: svc.id, commissionRate: svc.commissionRate };
    });
    // Remove empty placeholder if exists
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
    if (!selectedClient || !vehicleId) { setError("Selecione um cliente e veículo"); return; }
    const validComplaints = complaints.filter(c => c.description.trim());
    if (validComplaints.length === 0) { setError("Adicione ao menos uma reclamação com descrição"); return; }
    if (!validComplaints.some(c => c.services.some(s => s.description && s.price > 0))) {
      setError("Adicione ao menos um serviço em alguma reclamação"); return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: selectedClient.id,
        vehicleId,
        mileage: mileageIn,
        complaints: validComplaints.map(c => ({
          description: c.description,
          services: c.services.filter(s => s.description).map(s => ({
            description: s.description,
            price: s.price,
            timeMinutes: s.timeMinutes,
            serviceId: s.serviceId,
            commissionRate: s.commissionRate ?? undefined,
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
    if (!res.ok) { const data = await res.json(); setError(data.error || "Erro ao criar OS"); setSaving(false); return; }
    router.replace("/dashboard/orders");
  };

  const selectedVehicle = selectedClient?.vehicles.find(v => v.id === vehicleId);

  return (
    <div className="max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/orders" className="text-slate-400 hover:text-slate-600"><ArrowLeft size={20} /></Link>
        <h1 className="text-2xl font-bold text-slate-800">Orçamento de O.S.</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* CLIENTE */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h2 className="font-bold text-slate-800 mb-3 border-b pb-2">CLIENTE</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <Combobox
                options={clientOptions}
                value={clientSearch}
                onChange={(val) => {
                  setClientSearch(val);
                  if (selectedClient && val !== selectedClient.name) {
                    setSelectedClient(null);
                  }
                }}
                onSelect={(opt) => {
                  const client = clients.find(c => c.id === opt.id);
                  if (client) selectClient(client);
                }}
                placeholder="Buscar cliente..."
                label="NOME"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">CPF/CNPJ</label>
              <input type="text" readOnly value={selectedClient?.document || ""} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">TELEFONE</label>
              <input type="text" readOnly value={selectedClient?.phone || ""} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">E-MAIL</label>
              <input type="text" readOnly value={selectedClient?.email || ""} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">ENDEREÇO</label>
              <input type="text" readOnly value={selectedClient?.address || ""} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50" />
            </div>
          </div>
        </div>

        {/* VEÍCULO */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h2 className="font-bold text-slate-800 mb-3 border-b pb-2">VEÍCULO</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">VEÍCULO *</label>
              <select value={vehicleId}
                onChange={(e) => { setVehicleId(e.target.value); const v = selectedClient?.vehicles.find((v) => v.id === e.target.value); if (v) setMileageIn(v.mileage); }}
                disabled={!selectedClient}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100">
                <option value="">Selecione...</option>
                {selectedClient?.vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.plate} - {v.brand} {v.model} ({v.year}) {v.color || ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">PLACA</label>
              <input type="text" readOnly value={selectedVehicle?.plate || ""} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">COR</label>
              <input type="text" readOnly value={selectedVehicle?.color || ""} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">KM ENTRADA *</label>
              <input type="number" value={mileageIn || ""} onChange={(e) => setMileageIn(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">MARCA</label>
              <input type="text" readOnly value={selectedVehicle?.brand || ""} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">MODELO</label>
              <input type="text" readOnly value={selectedVehicle?.model || ""} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">ANO</label>
              <input type="text" readOnly value={selectedVehicle?.year || ""} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50" />
            </div>
          </div>
        </div>

        {/* RECLAMAÇÕES DO CLIENTE */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">RECLAMAÇÕES DO CLIENTE</h2>
            <button type="button" onClick={addComplaint}
              className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-1">
              <Plus size={14} /> Adicionar Reclamação
            </button>
          </div>

          {complaints.map((complaint, ci) => (
            <div key={ci} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Complaint Header */}
              <div
                className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200 cursor-pointer"
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
                  {/* Description */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">DESCRIÇÃO DA RECLAMAÇÃO *</label>
                    <input type="text" value={complaint.description}
                      onChange={(e) => { const u = [...complaints]; u[ci].description = e.target.value; setComplaints(u); }}
                      placeholder="Ex: Barulho na suspensão"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>

                  {/* Services within complaint */}
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
                                u[ci].services[si] = {
                                  description: svc.description,
                                  price: svc.defaultPrice,
                                  timeMinutes: svc.estimatedTime || 0,
                                  serviceId: svc.id,
                                  commissionRate: svc.commissionRate,
                                };
                                setComplaints(u);
                              }
                            }}
                            placeholder="Buscar serviço..."
                          />
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Preço (R$)</label>
                            <input type="number" value={s.price || ""}
                              onChange={(e) => { const u = [...complaints]; u[ci].services[si].price = Number(e.target.value); setComplaints(u); }}
                              placeholder="Valor"
                              className="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Tempo (min)</label>
                            <input type="number" value={s.timeMinutes || ""}
                              onChange={(e) => { const u = [...complaints]; u[ci].services[si].timeMinutes = Number(e.target.value); setComplaints(u); }}
                              placeholder="Min"
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

                  {/* Parts within complaint */}
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
                                const current = u[ci].parts[pi];
                                const matchedItem = stockItems.find(st => st.description === val);
                                u[ci].parts[pi] = { ...current, description: val, stockItemId: matchedItem ? matchedItem.id : undefined };
                                setComplaints(u);
                              }}
                              onSelect={(opt) => {
                                const item = stockItems.find(st => st.id === opt.id);
                                if (item) {
                                  const u = [...complaints];
                                  u[ci].parts[pi] = {
                                    description: item.description,
                                    brand: item.brand || "",
                                    quantity: 1,
                                    unitPrice: item.sellPrice,
                                    stockItemId: item.id,
                                  };
                                  setComplaints(u);
                                }
                              }}
                              placeholder="Buscar peça..."
                            />
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Marca</label>
                              <input type="text" value={p.brand}
                                onChange={(e) => { const u = [...complaints]; u[ci].parts[pi].brand = e.target.value; setComplaints(u); }}
                                placeholder="Marca" className="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Qtd</label>
                              <input type="number" value={p.quantity || ""}
                                onChange={(e) => { const u = [...complaints]; u[ci].parts[pi].quantity = Number(e.target.value); setComplaints(u); }}
                                placeholder="Qtd" className="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">R$ Unit</label>
                              <input type="number" value={p.unitPrice || ""}
                                onChange={(e) => { const u = [...complaints]; u[ci].parts[pi].unitPrice = Number(e.target.value); setComplaints(u); }}
                                placeholder="R$ Unit" className="w-full px-2 py-2 border border-slate-300 rounded-lg text-sm" />
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

        {/* TOTAL GERAL */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-slate-300 p-5">
          <h2 className="font-bold text-slate-800 mb-3 border-b pb-2">TOTAL</h2>
          <div className="space-y-2">
            {complaints.filter(c => c.description).map((c, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-slate-600">Reclamação #{i + 1}: {c.description}</span>
                <span className="font-medium text-slate-700">{formatCurrency(getComplaintTotal(c))}</span>
              </div>
            ))}
            <div className="flex justify-between pt-3 border-t border-slate-200">
              <span className="text-sm font-bold text-slate-800">TOTAL GERAL</span>
              <span className="text-2xl font-bold text-green-600">{formatCurrency(totalGeral)}</span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button type="submit" disabled={saving}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm">
            {saving ? "Criando OS..." : "Criar Ordem de Serviço"}
          </button>
          <Link href="/dashboard/orders"
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
