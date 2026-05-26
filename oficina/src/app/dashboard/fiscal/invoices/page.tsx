"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader, Badge, Select, Table, TableHeader, TableHead, TableBody, TableRow, TableCell, EmptyState, Modal, Button, Input } from "@/components/ui";
import { FileText } from "lucide-react";

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
  const [cancelModal, setCancelModal] = useState<Invoice | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter) params.set("type", typeFilter);
    fetch(`/api/fiscal/invoices?${params}`).then(r => r.json()).then(setInvoices).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [statusFilter, typeFilter]);

  const handleRetry = async (id: string) => {
    const res = await fetch(`/api/fiscal/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "retry" }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Erro ao reenviar");
    }
    fetchData();
  };

  const handleCancel = async () => {
    if (!cancelModal) return;
    if (cancelReason.trim().length < 15) {
      setCancelError("O motivo deve ter no mínimo 15 caracteres");
      return;
    }
    setCancelLoading(true);
    setCancelError("");
    const res = await fetch(`/api/fiscal/invoices/${cancelModal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", reason: cancelReason.trim() }),
    });
    if (!res.ok) {
      const err = await res.json();
      setCancelError(err.error || "Erro ao cancelar");
      setCancelLoading(false);
      return;
    }
    setCancelLoading(false);
    setCancelModal(null);
    setCancelReason("");
    fetchData();
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <PageHeader title="Notas Fiscais" description="Listagem de NF-e e NFS-e emitidas" />

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
                    <div className="flex gap-3">
                      {inv.status === "AUTHORIZED" && (
                        <button onClick={async () => { const r = await fetch(`/api/fiscal/invoices/${inv.id}/pdf`); if (r.ok) { const blob = await r.blob(); window.open(URL.createObjectURL(blob)); } }} className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100">DANFE</button>
                      )}
                      {["ERROR", "REJECTED"].includes(inv.status) && inv.retryCount < 3 && (
                        <button onClick={() => handleRetry(inv.id)} className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100">Reenviar</button>
                      )}
                      {inv.status === "AUTHORIZED" && (
                        <button onClick={() => { setCancelModal(inv); setCancelReason(""); setCancelError(""); }} className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100">Cancelar</button>
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
              <p className="text-sm text-red-600 mt-1">
                A nota <strong>{cancelModal.type} #{cancelModal.number}</strong> da OS #{cancelModal.order.number} ({cancelModal.order.client.name}) será cancelada.
              </p>
            </div>

            <Input
              label="Motivo do cancelamento"
              value={cancelReason}
              onChange={e => { setCancelReason(e.target.value); setCancelError(""); }}
              placeholder="Descreva o motivo (mínimo 15 caracteres)"
              error={cancelError}
              hint={`${cancelReason.trim().length}/15 caracteres mínimos`}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setCancelModal(null)}>Voltar</Button>
              <Button variant="danger" onClick={handleCancel} loading={cancelLoading} disabled={cancelReason.trim().length < 15}>
                Confirmar Cancelamento
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
