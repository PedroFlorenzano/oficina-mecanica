"use client";

import { useState, useEffect } from "react";
import { PageHeader, Badge, Select, Table, TableHeader, TableHead, TableBody, TableRow, TableCell, EmptyState } from "@/components/ui";
import { FileText } from "lucide-react";

interface Invoice {
  id: string;
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

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter) params.set("type", typeFilter);
    fetch(`/api/fiscal/invoices?${params}`).then(r => r.json()).then(setInvoices).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [statusFilter, typeFilter]);

  const handleAction = async (id: string, action: string, reason?: string) => {
    await fetch(`/api/fiscal/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
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
                  <TableCell>#{inv.order.number}</TableCell>
                  <TableCell>{inv.order.client.name}</TableCell>
                  <TableCell>{fmt(inv.totalAmount)}</TableCell>
                  <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {["ERROR", "REJECTED"].includes(inv.status) && inv.retryCount < 3 && (
                        <button onClick={() => handleAction(inv.id, "retry")} className="text-xs text-blue-600 hover:underline">Reenviar</button>
                      )}
                      {inv.status === "AUTHORIZED" && (
                        <button onClick={() => { const r = prompt("Motivo do cancelamento (min 15 chars):"); if (r && r.length >= 15) handleAction(inv.id, "cancel", r); }} className="text-xs text-red-600 hover:underline">Cancelar</button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
