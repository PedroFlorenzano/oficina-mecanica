"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DollarSign, Plus, Check, X, CreditCard, Eye } from "lucide-react";
import {
  PageHeader,
  Button,
  Badge,
  Card,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Select,
  EmptyState,
  Modal,
  Input,
} from "@/components/ui";

interface Commission {
  id: string;
  mechanicId: string;
  mechanic: { name: string };
  startDate: string;
  endDate: string;
  commissionRate: number;
  totalBase: number;
  totalCommission: number;
  status: string;
  createdAt: string;
  _count?: { items: number };
}

interface Summary {
  totalPending: number;
  totalApproved: number;
  totalPaidMonth: number;
  totalPaidAll: number;
}

const statusBadge: Record<string, { label: string; variant: "warning" | "info" | "success" | "error" }> = {
  PENDING: { label: "Pendente", variant: "warning" },
  APPROVED: { label: "Aprovada", variant: "info" },
  PAID: { label: "Paga", variant: "success" },
  CANCELLED: { label: "Cancelada", variant: "error" },
};

export default function CommissionsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const role = session?.user?.role;
  const isAdmin = role === "ADMIN";

  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [cancelModal, setCancelModal] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);

      const [commRes, sumRes] = await Promise.all([
        fetch(`/api/commissions?${params}`),
        fetch("/api/commissions/summary"),
      ]);

      if (commRes.ok) setCommissions(await commRes.json());
      if (sumRes.ok) setSummary(await sumRes.json());
    } catch {
      // silencioso — dados ficam vazios
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    const res = await fetch(`/api/commissions/${id}/approve`, { method: "PATCH" });
    if (res.ok) fetchData();
    setActionLoading(false);
  };

  const handlePay = async (id: string) => {
    setActionLoading(true);
    const res = await fetch(`/api/commissions/${id}/pay`, { method: "PATCH" });
    if (res.ok) fetchData();
    setActionLoading(false);
  };

  const handleCancel = async () => {
    if (!cancelModal || cancelReason.trim().length < 3) return;
    setActionLoading(true);
    const res = await fetch(`/api/commissions/${cancelModal}/cancel`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancelReason }),
    });
    if (res.ok) {
      setCancelModal(null);
      setCancelReason("");
      fetchData();
    }
    setActionLoading(false);
  };

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comissões"
        description="Gestão de comissões dos mecânicos"
        action={
          isAdmin && (
            <Button onClick={() => router.push("/dashboard/commissions/new")}>
              <Plus className="w-4 h-4 mr-2" />
              Gerar Comissão
            </Button>
          )
        }
      />

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-gray-500">Pendente</p>
            <p className="text-xl font-bold text-yellow-600">{fmt(summary.totalPending)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Aprovada</p>
            <p className="text-xl font-bold text-blue-600">{fmt(summary.totalApproved)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Pago (mês)</p>
            <p className="text-xl font-bold text-green-600">{fmt(summary.totalPaidMonth)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Pago (total)</p>
            <p className="text-xl font-bold text-green-700">{fmt(summary.totalPaidAll)}</p>
          </Card>
        </div>
      )}

      <div className="flex gap-4 items-end">
        <Select
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: "", label: "Todos" },
            { value: "PENDING", label: "Pendente" },
            { value: "APPROVED", label: "Aprovada" },
            { value: "PAID", label: "Paga" },
            { value: "CANCELLED", label: "Cancelada" },
          ]}
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : commissions.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="Nenhuma comissão encontrada"
          description="Gere uma comissão para um mecânico selecionando o período desejado."
        />
      ) : (
        <Table>
          <TableHeader>
              <TableHead>Mecânico</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Taxa</TableHead>
              <TableHead>Valor Base</TableHead>
              <TableHead>Comissão</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
          </TableHeader>
          <TableBody>
            {commissions.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.mechanic.name}</TableCell>
                <TableCell>{fmtDate(c.startDate)} — {fmtDate(c.endDate)}</TableCell>
                <TableCell>{c.commissionRate}%</TableCell>
                <TableCell>{fmt(c.totalBase)}</TableCell>
                <TableCell className="font-semibold">{fmt(c.totalCommission)}</TableCell>
                <TableCell>{c._count?.items ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={statusBadge[c.status]?.variant ?? "default"}>
                    {statusBadge[c.status]?.label ?? c.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <button
                      onClick={() => router.push(`/dashboard/commissions/${c.id}`)}
                      className="p-1 text-gray-500 hover:text-blue-600"
                      title="Ver detalhes"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {isAdmin && c.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => handleApprove(c.id)}
                          className="p-1 text-gray-500 hover:text-green-600"
                          title="Aprovar"
                          disabled={actionLoading}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCancelModal(c.id)}
                          className="p-1 text-gray-500 hover:text-red-600"
                          title="Cancelar"
                          disabled={actionLoading}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {isAdmin && c.status === "APPROVED" && (
                      <>
                        <button
                          onClick={() => handlePay(c.id)}
                          className="p-1 text-gray-500 hover:text-green-600"
                          title="Marcar como paga"
                          disabled={actionLoading}
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCancelModal(c.id)}
                          className="p-1 text-gray-500 hover:text-red-600"
                          title="Cancelar"
                          disabled={actionLoading}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {cancelModal && (
        <Modal isOpen onClose={() => setCancelModal(null)} title="Cancelar Comissão" size="sm">
          <div className="space-y-4">
            <Input
              label="Motivo do cancelamento"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Informe o motivo (mínimo 3 caracteres)"
              required
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setCancelModal(null)}>
                Voltar
              </Button>
              <Button
                variant="danger"
                onClick={handleCancel}
                loading={actionLoading}
                disabled={cancelReason.trim().length < 3}
              >
                Confirmar Cancelamento
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
