"use client";

import { useState, useEffect, use, Fragment } from "react";
import { useSession } from "next-auth/react";
import { ArrowLeft, Printer, FileDown, XCircle, Droplet, MessageCircle, FileText } from "lucide-react";
import Link from "next/link";
import TimerControl from "@/components/timer/TimerControl";
import OilLabel from "@/components/OilLabel";

interface ComplaintData {
  id: string;
  number: number;
  description: string;
  services: { id: string; description: string; price: number; timeMinutes?: number | null }[];
  parts: { id: string; description: string; quantity: number; unitPrice: number; totalPrice: number; stockItem?: { supplier?: string | null } | null }[];
}

interface Order {
  id: string;
  number: number;
  status: string;
  mileage: number;
  notes: string | null;
  cancelReason?: string | null;
  totalAmount: number;
  createdAt: string;
  client: { name: string; document: string; phone: string | null; email: string | null; address: string | null };
  vehicle: { plate: string; brand: string; model: string; year: number; color: string | null; mileage: number };
  createdBy: { name: string };
  complaints: ComplaintData[];
  services: { id: string; description: string; price: number; timeMinutes?: number | null; complaintId: string | null }[];
  parts: { id: string; description: string; quantity: number; unitPrice: number; totalPrice: number; complaintId: string | null; stockItem?: { supplier?: string | null } | null }[];
  statusHistory: { id: string; fromStatus: string | null; toStatus: string; createdAt: string }[];
}

const statusLabels: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Aberta", color: "bg-blue-100 text-blue-700" },
  IN_PROGRESS: { label: "Em Execução", color: "bg-yellow-100 text-yellow-700" },
  WAITING_PART: { label: "Aguardando Peça", color: "bg-orange-100 text-orange-700" },
  WAITING_APPROVAL: { label: "Aguardando Aprovação", color: "bg-purple-100 text-purple-700" },
  COMPLETED: { label: "Concluída", color: "bg-green-100 text-green-700" },
  DELIVERED: { label: "Entregue", color: "bg-slate-100 text-slate-700" },
  CANCELLED: { label: "Cancelada", color: "bg-red-100 text-red-700" },
};

const statusFlow = ["OPEN", "IN_PROGRESS", "WAITING_PART", "WAITING_APPROVAL", "COMPLETED", "DELIVERED", "CANCELLED"];
const TERMINAL_STATUSES = ["COMPLETED", "DELIVERED", "CANCELLED"];

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const userId = session?.user?.userId ?? "";
  const userRole = session?.user?.role ?? "";

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Estado do modal de cancelamento
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  // Estado da etiqueta de óleo
  const [oilLabelData, setOilLabelData] = useState<any>(null);

  // Estado WhatsApp
  const [whatsAppMsg, setWhatsAppMsg] = useState("");

  const fetchOrder = () => {
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((data) => { setOrder(data); setLoading(false); });
  };

  useEffect(() => { fetchOrder(); }, [id]);

  const changeStatus = async (newStatus: string) => {
    setUpdating(true);
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    fetchOrder();
    setUpdating(false);
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      setCancelError("Informe o motivo do cancelamento");
      return;
    }
    setCancelling(true);
    setCancelError("");
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", reason: cancelReason }),
      });
      if (res.ok) {
        fetchOrder();
        setShowCancelModal(false);
        setCancelReason("");
      } else {
        const data = await res.json();
        setCancelError(data.error || "Erro ao cancelar OS");
      }
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <p className="p-6 text-slate-500">Carregando...</p>;
  if (!order) return <p className="p-6 text-red-500">OS não encontrada</p>;

  const status = statusLabels[order.status] || { label: order.status, color: "" };
  const hasComplaints = order.complaints && order.complaints.length > 0;
  const canCancel = !TERMINAL_STATUSES.includes(order.status);

  const handleOilLabel = async () => {
    const res = await fetch(`/api/orders/${order.id}/oil-label`);
    if (res.ok) setOilLabelData(await res.json());
  };

  const handleWhatsApp = async (action: "approval" | "delivery") => {
    setWhatsAppMsg("");
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, orderId: order.id }),
    });
    const data = await res.json();
    if (res.ok) {
      setWhatsAppMsg(`✓ Link enviado para ${order.client.phone}`);
    } else {
      setWhatsAppMsg(`✗ ${data.error}`);
    }
    setTimeout(() => setWhatsAppMsg(""), 5000);
  };

  // For orders without complaints, use flat services/parts
  const ungroupedServices = order.services.filter(s => !s.complaintId);
  const ungroupedParts = order.parts.filter(p => !p.complaintId);
  const totalParts = order.parts.reduce((s, p) => s + p.totalPrice, 0);
  const totalServices = order.services.reduce((s, sv) => s + sv.price, 0);

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/orders" className="text-slate-400 hover:text-slate-600"><ArrowLeft size={20} /></Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">O.S. #{order.number}</h1>
            <p className="text-sm text-slate-500">Aberto em {new Date(order.createdAt).toLocaleString("pt-BR")} por {order.createdBy.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium px-3 py-1.5 rounded-full ${status.color}`}>{status.label}</span>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">
            <Printer size={16} /> Imprimir
          </button>
          {/* Botão Baixar PDF */}
          <a
            href={`/api/orders/${order.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
          >
            <FileDown size={16} /> Baixar PDF
          </a>
          <button
            onClick={handleOilLabel}
            className="flex items-center gap-2 px-3 py-2 border border-amber-300 bg-amber-50 rounded-lg text-sm hover:bg-amber-100 text-amber-700"
          >
            <Droplet size={16} /> Etiqueta Óleo
          </button>
          {order.status === "WAITING_APPROVAL" && (
            <button
              onClick={() => handleWhatsApp("approval")}
              className="flex items-center gap-2 px-3 py-2 border border-green-300 bg-green-50 rounded-lg text-sm hover:bg-green-100 text-green-700"
            >
              <MessageCircle size={16} /> Enviar Aprovação
            </button>
          )}
          {order.status === "COMPLETED" && (
            <button
              onClick={() => handleWhatsApp("delivery")}
              className="flex items-center gap-2 px-3 py-2 border border-green-300 bg-green-50 rounded-lg text-sm hover:bg-green-100 text-green-700"
            >
              <MessageCircle size={16} /> Notificar Entrega
            </button>
          )}
          {["COMPLETED", "DELIVERED"].includes(order.status) && (
            <button
              onClick={async () => {
                const type = prompt("Tipo de nota: NFE (produtos) ou NFSE (serviços):", "NFSE");
                if (!type || !["NFE", "NFSE"].includes(type.toUpperCase())) return;
                const res = await fetch(`/api/orders/${order.id}/invoice`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: type.toUpperCase() }) });
                const data = await res.json();
                if (res.ok) setWhatsAppMsg("✓ Nota fiscal criada com sucesso");
                else setWhatsAppMsg(`✗ ${data.error}`);
                setTimeout(() => setWhatsAppMsg(""), 5000);
              }}
              className="flex items-center gap-2 px-3 py-2 border border-indigo-300 bg-indigo-50 rounded-lg text-sm hover:bg-indigo-100 text-indigo-700"
            >
              <FileText size={16} /> Emitir NF
            </button>
          )}
        </div>
      </div>

      {/* WhatsApp feedback */}
      {whatsAppMsg && (
        <div className={`rounded-lg px-4 py-2 text-sm mb-4 ${whatsAppMsg.startsWith("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {whatsAppMsg}
        </div>
      )}

      {/* Status Actions */}
      {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-4">
          <p className="text-sm text-slate-600 mb-2">Alterar status:</p>
          <div className="flex flex-wrap gap-2">
            {statusFlow.filter(s => s !== order.status && s !== "CANCELLED").map(s => {
              const st = statusLabels[s];
              return (
                <button key={s} onClick={() => changeStatus(s)} disabled={updating}
                  className={`text-xs px-3 py-1.5 rounded-full border hover:opacity-80 disabled:opacity-50 ${st.color}`}>
                  {st.label}
                </button>
              );
            })}
            {/* Botão Cancelar OS */}
            {canCancel && (
              <button
                onClick={() => { setShowCancelModal(true); setCancelError(""); setCancelReason(""); }}
                disabled={updating}
                className="text-xs px-3 py-1.5 rounded-full border hover:opacity-80 disabled:opacity-50 bg-red-100 text-red-700 border-red-200"
              >
                <span className="flex items-center gap-1"><XCircle size={12} /> Cancelar OS</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Motivo de cancelamento */}
      {order.status === "CANCELLED" && order.cancelReason && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-sm font-medium text-red-700 mb-1">Motivo do cancelamento:</p>
          <p className="text-sm text-red-600">{order.cancelReason}</p>
        </div>
      )}

      {/* Modal de cancelamento */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Cancelar Ordem de Serviço</h3>
                <p className="text-sm text-slate-500">O.S. #{order.number}</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 mb-3">
              Informe o motivo do cancelamento. As reservas de estoque serão automaticamente revertidas.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => { setCancelReason(e.target.value); setCancelError(""); }}
              placeholder="Descreva o motivo do cancelamento..."
              rows={4}
              className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none mb-2"
            />
            {cancelError && (
              <p className="text-sm text-red-600 mb-3">{cancelError}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                disabled={cancelling}
              >
                Voltar
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={cancelling}
              >
                {cancelling ? "Cancelando..." : "Confirmar Cancelamento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cliente */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-4">
        <h2 className="font-bold text-slate-800 mb-3 border-b pb-2">CLIENTE</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div><span className="text-xs text-slate-500">NOME</span><p className="font-medium text-slate-800">{order.client.name}</p></div>
          <div><span className="text-xs text-slate-500">CPF/CNPJ</span><p className="text-slate-700">{order.client.document}</p></div>
          <div><span className="text-xs text-slate-500">TELEFONE</span><p className="text-slate-700">{order.client.phone || "—"}</p></div>
          <div><span className="text-xs text-slate-500">E-MAIL</span><p className="text-slate-700">{order.client.email || "—"}</p></div>
          <div className="md:col-span-2"><span className="text-xs text-slate-500">ENDEREÇO</span><p className="text-slate-700">{order.client.address || "—"}</p></div>
        </div>
      </div>

      {/* Veículo */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-4">
        <h2 className="font-bold text-slate-800 mb-3 border-b pb-2">VEÍCULO</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><span className="text-xs text-slate-500">PLACA</span><p className="font-mono font-medium text-slate-800">{order.vehicle.plate}</p></div>
          <div><span className="text-xs text-slate-500">MARCA</span><p className="text-slate-700">{order.vehicle.brand}</p></div>
          <div><span className="text-xs text-slate-500">MODELO</span><p className="text-slate-700">{order.vehicle.model}</p></div>
          <div><span className="text-xs text-slate-500">ANO</span><p className="text-slate-700">{order.vehicle.year}</p></div>
          <div><span className="text-xs text-slate-500">COR</span><p className="text-slate-700">{order.vehicle.color || "—"}</p></div>
          <div><span className="text-xs text-slate-500">KM ENTRADA</span><p className="font-medium text-slate-800">{order.mileage.toLocaleString("pt-BR")} km</p></div>
        </div>
      </div>

      {/* Complaints grouped view */}
      {hasComplaints && (
        <div className="space-y-4 mb-4">
          <h2 className="font-bold text-slate-800 text-lg">RECLAMAÇÕES</h2>
          {order.complaints.map((complaint) => {
            const cSvcTotal = complaint.services.reduce((s, sv) => s + sv.price, 0);
            const cPrtTotal = complaint.parts.reduce((s, p) => s + p.totalPrice, 0);
            const cTotal = cSvcTotal + cPrtTotal;
            return (
              <div key={complaint.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <h3 className="font-bold text-slate-800 mb-3 border-b pb-2">
                  #{complaint.number} — {complaint.description}
                </h3>

                {/* Services */}
                {complaint.services.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-bold text-slate-500 mb-1">SERVIÇOS</p>
                    <table className="w-full text-sm">
                      <thead className="text-xs text-slate-400">
                        <tr>
                          <th className="text-left py-1">Descrição</th>
                          <th className="text-right py-1 w-24">Tempo</th>
                          <th className="text-right py-1 w-28">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {complaint.services.map((s) => (
                          <Fragment key={s.id}>
                            <tr>
                              <td className="py-1.5 text-slate-700">{s.description}</td>
                              <td className="py-1.5 text-right text-slate-500">{s.timeMinutes ? `${s.timeMinutes} min` : "—"}</td>
                              <td className="py-1.5 text-right font-medium text-slate-800">R$ {s.price.toFixed(2)}</td>
                            </tr>
                            <tr>
                              <td colSpan={3} className="py-2 px-0">
                                <TimerControl
                                  orderServiceId={s.id}
                                  userId={userId}
                                  userRole={userRole}
                                  serviceDescription={s.description}
                                />
                              </td>
                            </tr>
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Parts */}
                {complaint.parts.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-bold text-slate-500 mb-1">PEÇAS</p>
                    <table className="w-full text-sm">
                      <thead className="text-xs text-slate-400">
                        <tr>
                          <th className="text-left py-1">Descrição</th>
                          <th className="text-left py-1">Fornecedor</th>
                          <th className="text-center py-1 w-12">Qtd</th>
                          <th className="text-right py-1 w-24">Unit.</th>
                          <th className="text-right py-1 w-28">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {complaint.parts.map((p) => (
                          <tr key={p.id}>
                            <td className="py-1.5 text-slate-700">{p.description}</td>
                            <td className="py-1.5 text-slate-500 text-xs">{p.stockItem?.supplier || "—"}</td>
                            <td className="py-1.5 text-center text-slate-600">{p.quantity}x</td>
                            <td className="py-1.5 text-right text-slate-600">R$ {p.unitPrice.toFixed(2)}</td>
                            <td className="py-1.5 text-right font-medium text-slate-800">R$ {p.totalPrice.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Subtotal */}
                <div className="text-right pt-2 border-t">
                  <span className="font-bold text-slate-800">Subtotal: R$ {cTotal.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ungrouped services (legacy orders without complaints) */}
      {ungroupedServices.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-4">
          <h2 className="font-bold text-slate-800 mb-3 border-b pb-2">SERVIÇOS</h2>
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 border-b">
              <tr>
                <th className="text-left py-2">Descrição</th>
                <th className="text-right py-2">Tempo</th>
                <th className="text-right py-2">R$ Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ungroupedServices.map((s) => (
                <Fragment key={s.id}>
                  <tr>
                    <td className="py-2 text-slate-700">{s.description}</td>
                    <td className="py-2 text-right text-slate-500">{s.timeMinutes ? `${s.timeMinutes} min` : "—"}</td>
                    <td className="py-2 text-right font-medium text-slate-800">R$ {s.price.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="py-2 px-0">
                      <TimerControl
                        orderServiceId={s.id}
                        userId={userId}
                        userRole={userRole}
                        serviceDescription={s.description}
                      />
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Ungrouped parts (legacy orders without complaints) */}
      {ungroupedParts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-4">
          <h2 className="font-bold text-slate-800 mb-3 border-b pb-2">PRODUTOS</h2>
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 border-b">
              <tr>
                <th className="text-left py-2">Descrição</th>
                <th className="text-left py-2">Fornecedor</th>
                <th className="text-center py-2">Qtd</th>
                <th className="text-right py-2">R$ Unit</th>
                <th className="text-right py-2">R$ Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ungroupedParts.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 text-slate-700">{p.description}</td>
                  <td className="py-2 text-slate-500 text-xs">{p.stockItem?.supplier || "—"}</td>
                  <td className="py-2 text-center text-slate-600">{p.quantity}</td>
                  <td className="py-2 text-right text-slate-600">R$ {p.unitPrice.toFixed(2)}</td>
                  <td className="py-2 text-right font-medium text-slate-800">R$ {p.totalPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Observações */}
      {order.notes && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-4">
          <h2 className="font-bold text-slate-800 mb-3 border-b pb-2">OBSERVAÇÕES</h2>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{order.notes}</p>
        </div>
      )}

      {/* Total Geral */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-slate-300 p-5 mb-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-slate-500">TOTAL PRODUTOS</p>
            <p className="text-lg font-bold text-slate-700">R$ {totalParts.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">TOTAL SERVIÇOS</p>
            <p className="text-lg font-bold text-slate-700">R$ {totalServices.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">TOTAL GERAL</p>
            <p className="text-2xl font-bold text-green-600">R$ {order.totalAmount.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Histórico de Status */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h2 className="font-bold text-slate-800 mb-3 border-b pb-2">HISTÓRICO</h2>
        <div className="space-y-2">
          {order.statusHistory.map((h) => {
            const to = statusLabels[h.toStatus] || { label: h.toStatus, color: "" };
            return (
              <div key={h.id} className="flex items-center gap-3 text-sm">
                <span className="text-xs text-slate-400 w-36">{new Date(h.createdAt).toLocaleString("pt-BR")}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${to.color}`}>{to.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Etiqueta de Troca de Óleo */}
      {oilLabelData && (
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-5">
          <h2 className="font-bold text-slate-800 mb-3 border-b pb-2 flex items-center gap-2">
            <Droplet size={16} className="text-amber-600" /> ETIQUETA DE TROCA DE ÓLEO
          </h2>
          <OilLabel data={oilLabelData} onClose={() => setOilLabelData(null)} />
        </div>
      )}
    </div>
  );
}
