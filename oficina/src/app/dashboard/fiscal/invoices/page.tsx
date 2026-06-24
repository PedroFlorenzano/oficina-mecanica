"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader, Badge, Select, Table, TableHeader, TableHead, TableBody, TableRow, TableCell, EmptyState, Modal, Button, Input } from "@/components/ui";
import { FileText, Download } from "lucide-react";

interface Invoice {
  id: string;
  orderId: string;
  type: string;
  status: string;
  number: number | null;
  totalAmount: number;
  createdAt: string;
  retryCount: number;
  lastError: string | null;
  accessKey: string | null;
  order: { number: number; client: { name: string } };
}

const statusBadge: Record<string, { label: string; variant: "warning" | "info" | "success" | "error" | "default" }> = {
  PENDING: { label: "Pendente", variant: "warning" },
  PROCESSING: { label: "Processando", variant: "info" },
  AUTHORIZED: { label: "Autorizada", variant: "success" },
  REJECTED: { label: "Rejeitada", variant: "error" },
  CANCELLED: { label: "Cancelada", variant: "error" },
  ERROR: { label: "Erro", variant: "error" },
};

export default function FiscalInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Cancel modal
  const [cancelModal, setCancelModal] = useState<Invoice | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState("");

  // CC-e modal
  const [cceModal, setCceModal] = useState<Invoice | null>(null);
  const [cceText, setCceText] = useState("");
  const [cceLoading, setCceLoading] = useState(false);
  const [cceResult, setCceResult] = useState("");

  // Export
  const [exportModal, setExportModal] = useState(false);
  const [exportStart, setExportStart] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10); });
  const [exportEnd, setExportEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [exportLoading, setExportLoading] = useState(false);

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter) params.set("type", typeFilter);
    fetch(`/api/fiscal/invoices?${params}`).then(r => r.json()).then(setInvoices).finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, [statusFilter, typeFilter]);

  const handleRetry = async (id: string) => {
    const res = await fetch(`/api/fiscal/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "retry" }),
    });
    if (!res.ok) { const err = await res.json(); alert(err.error || "Erro ao reenviar"); }
    fetchData();
  };

  const handleCancel = async () => {
    if (!cancelModal || cancelReason.trim().length < 15) { setCancelError("O motivo deve ter no mínimo 15 caracteres"); return; }
    setCancelLoading(true); setCancelError("");
    const res = await fetch(`/api/fiscal/invoices/${cancelModal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", reason: cancelReason.trim() }),
    });
    if (!res.ok) { const err = await res.json(); setCancelError(err.error || "Erro ao cancelar"); setCancelLoading(false); return; }
    setCancelLoading(false); setCancelModal(null); setCancelReason(""); fetchData();
  };

  const handleCCe = async () => {
    if (!cceModal || cceText.trim().length < 15) return;
    setCceLoading(true); setCceResult("");
    try {
      const res = await fetch("/api/fiscal/carta-correcao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: cceModal.id, correcao: cceText.trim() }),
      });
      const data = await res.json();
      setCceResult(res.ok ? `✅ CC-e registrada. Protocolo: ${data.protocolNumber}` : `❌ ${data.error || "Erro"}`);
    } catch { setCceResult("❌ Erro de conexão"); }
    setCceLoading(false);
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const params = new URLSearchParams({ startDate: exportStart, endDate: exportEnd });
      if (typeFilter) params.set("type", typeFilter);
      const res = await fetch(`/api/fiscal/export?${params}`);
      if (!res.ok) { const err = await res.json(); alert(err.error || "Erro"); setExportLoading(false); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `XMLs_Fiscais_${exportStart.slice(0, 7)}.zip`; a.click();
      URL.revokeObjectURL(url);
      setExportModal(false);
    } catch { alert("Erro ao exportar"); }
    setExportLoading(false);
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <PageHeader title="Notas Fiscais" description="Listagem de NF-e e NFS-e emitidas" action={
        <Button variant="outline" onClick={() => setExportModal(true)}><Download size={16} className="mr-1.5" />Exportar p/ Contador</Button>
      } />

      <div className="flex gap-4">
        <Select label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} options={[{ value: "", label: "Todos" }, { value: "PENDING", label: "Pendente" }, { value: "AUTHORIZED", label: "Autorizada" }, { value: "REJECTED", label: "Rejeitada" }, { value: "ERROR", label: "Erro" }, { value: "CANCELLED", label: "Cancelada" }]} />
        <Select label="Tipo" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} options={[{ value: "", label: "Todos" }, { value: "NFE", label: "NF-e" }, { value: "NFSE", label: "NFS-e" }]} />
      </div>

      {loading ? <p className="text-slate-500">Carregando...</p> : invoices.length === 0 ? (
        <EmptyState icon={FileText} title="Nenhuma nota fiscal" description="Emita notas fiscais a partir das ordens de serviço concluídas." />
      ) : (
        <Table>
          <TableHeader>
            <TableHead>Nº</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>OS</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableHeader>
          <TableBody>
            {invoices.map(inv => {
              const st = statusBadge[inv.status] ?? { label: inv.status, variant: "default" as const };
              return (
                <TableRow key={inv.id}>
                  <TableCell>{inv.number || "—"}</TableCell>
                  <TableCell><Badge variant={inv.type === "NFE" ? "info" : "default"}>{inv.type}</Badge></TableCell>
                  <TableCell><Link href={`/dashboard/orders/${inv.orderId}`} className="text-blue-600 hover:underline font-medium">#{inv.order.number}</Link></TableCell>
                  <TableCell>{inv.order.client.name}</TableCell>
                  <TableCell>{fmt(inv.totalAmount)}</TableCell>
                  <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-2 flex-wrap">
                      {inv.status === "AUTHORIZED" && (
                        <>
                          <button onClick={async () => { const r = await fetch(`/api/fiscal/invoices/${inv.id}/pdf`); if (r.ok) { const blob = await r.blob(); window.open(URL.createObjectURL(blob)); } }} className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100">DANFE</button>
                          <button onClick={() => { setCancelModal(inv); setCancelReason(""); setCancelError(""); }} className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100">Cancelar</button>
                          {inv.type === "NFE" && (
                            <button onClick={() => { setCceModal(inv); setCceText(""); setCceResult(""); }} className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-50 rounded hover:bg-amber-100">CC-e</button>
                          )}
                        </>
                      )}
                      {["ERROR", "REJECTED"].includes(inv.status) && inv.retryCount < 3 && (
                        <button onClick={() => handleRetry(inv.id)} className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100">Reenviar</button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Modal de Cancelamento */}
      <Modal isOpen={!!cancelModal} onClose={() => setCancelModal(null)} title="Cancelar Nota Fiscal" size="sm">
        {cancelModal && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium">Atenção: esta ação é irreversível</p>
              <p className="text-sm text-red-600 mt-1">A nota <strong>{cancelModal.type} #{cancelModal.number}</strong> da OS #{cancelModal.order.number} ({cancelModal.order.client.name}) será cancelada.</p>
            </div>
            <Input label="Motivo do cancelamento" value={cancelReason} onChange={e => { setCancelReason(e.target.value); setCancelError(""); }} placeholder="Descreva o motivo (mínimo 15 caracteres)" error={cancelError} hint={`${cancelReason.trim().length}/15 caracteres mínimos`} />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setCancelModal(null)}>Voltar</Button>
              <Button variant="danger" onClick={handleCancel} loading={cancelLoading} disabled={cancelReason.trim().length < 15}>Confirmar Cancelamento</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal CC-e */}
      <Modal isOpen={!!cceModal} onClose={() => setCceModal(null)} title="Carta de Correção Eletrônica" size="sm">
        {cceModal && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">NF-e #{cceModal.number} — OS #{cceModal.order.number}</p>
              <p className="text-xs text-amber-600 mt-1">Não pode corrigir valores, destinatário ou dados que alterem o imposto.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Texto da Correção</label>
              <textarea value={cceText} onChange={e => setCceText(e.target.value)} rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Mínimo 15 caracteres" />
              <p className="text-xs text-slate-500 mt-1">{cceText.trim().length}/15 caracteres mínimos</p>
            </div>
            {cceResult && <p className="text-sm">{cceResult}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setCceModal(null)}>Fechar</Button>
              <Button onClick={handleCCe} loading={cceLoading} disabled={cceText.trim().length < 15}>Enviar CC-e</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Exportar para Contador */}
      <Modal isOpen={exportModal} onClose={() => setExportModal(false)} title="Exportar XMLs para Contador" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Selecione o período para exportar as notas autorizadas em um arquivo ZIP.</p>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Data Início" type="date" value={exportStart} onChange={e => setExportStart(e.target.value)} />
            <Input label="Data Fim" type="date" value={exportEnd} onChange={e => setExportEnd(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setExportModal(false)}>Cancelar</Button>
            <Button onClick={handleExport} loading={exportLoading}><Download size={16} className="mr-1.5" />Baixar ZIP</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
