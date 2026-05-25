"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft, Check, CreditCard, X } from "lucide-react";
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
  Modal,
  Input,
} from "@/components/ui";

interface CommissionItem {
  id: string;
  baseValue: number;
  commissionValue: number;
  orderService: {
    description: string;
    order: {
      id: string;
      number: number;
      client: { name: string };
      vehicle: { model: string; plate: string };
    };
  };
}

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
  approvedAt: string | null;
  paidAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  items: CommissionItem[];
}

const statusBadge: Record<string, { label: string; variant: "warning" | "info" | "success" | "error" }> = {
  PENDING: { label: "Pendente", variant: "warning" },
  APPROVED: { label: "Aprovada", variant: "info" },
  PAID: { label: "Paga", variant: "success" },
  CANCELLED: { label: "Cancelada", variant: "error" },
};

export default function CommissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [commission, setCommission] = useState<Commission | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    fetch(`/api/commissions/${id}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { setCommission(data); })
      .catch(() => { setCommission(null); })
      .finally(() => setLoading(false));
  }, [id]);

  const refetch = async () => {
    const res = await fetch(`/api/commissions/${id}`);
    if (res.ok) setCommission(await res.json());
  };

  const handleApprove = async () => {
    setActionLoading(true);
    const res = await fetch(`/api/commissions/${id}/approve`, { method: "PATCH" });
    if (res.ok) await refetch();
    setActionLoading(false);
  };

  const handlePay = async () => {
    setActionLoading(true);
    const res = await fetch(`/api/commissions/${id}/pay`, { method: "PATCH" });
    if (res.ok) await refetch();
    setActionLoading(false);
  };

  const handleCancel = async () => {
    if (cancelReason.trim().length < 3) return;
    setActionLoading(true);
    const res = await fetch(`/api/commissions/${id}/cancel`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancelReason }),
    });
    if (res.ok) {
      await refetch();
      setCancelModal(false);
    }
    setActionLoading(false);
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");

  if (loading) return <div className="text-center py-12 text-gray-500">Carregando...</div>;
  if (!commission) return <div className="text-center py-12 text-red-500">Comissão não encontrada</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Comissão — ${commission.mechanic.name}`}
        description={`${fmtDate(commission.startDate)} a ${fmtDate(commission.endDate)}`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/dashboard/commissions")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            {isAdmin && commission.status === "PENDING" && (
              <>
                <Button onClick={handleApprove} loading={actionLoading}>
                  <Check className="w-4 h-4 mr-2" />
                  Aprovar
                </Button>
                <Button variant="danger" onClick={() => setCancelModal(true)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </>
            )}
            {isAdmin && commission.status === "APPROVED" && (
              <>
                <Button onClick={handlePay} loading={actionLoading}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Marcar como Paga
                </Button>
                <Button variant="danger" onClick={() => setCancelModal(true)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-gray-500">Status</p>
          <Badge variant={statusBadge[commission.status]?.variant ?? "default"}>
            {statusBadge[commission.status]?.label ?? commission.status}
          </Badge>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Taxa</p>
          <p className="text-lg font-bold">{commission.commissionRate}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Valor Base</p>
          <p className="text-lg font-bold">{fmt(commission.totalBase)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-500">Comissão</p>
          <p className="text-lg font-bold text-green-600">{fmt(commission.totalCommission)}</p>
        </Card>
      </div>

      {commission.approvedAt && (
        <p className="text-sm text-gray-500">Aprovada em: {fmtDate(commission.approvedAt)}</p>
      )}
      {commission.paidAt && (
        <p className="text-sm text-gray-500">Paga em: {fmtDate(commission.paidAt)}</p>
      )}
      {commission.cancelReason && (
        <p className="text-sm text-red-600">Motivo do cancelamento: {commission.cancelReason}</p>
      )}

      <Card className="p-4">
        <h3 className="font-semibold mb-4">Serviços ({commission.items.length})</h3>
        <Table>
          <TableHeader>
              <TableHead>OS</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Veículo</TableHead>
              <TableHead>Serviço</TableHead>
              <TableHead>Valor Base</TableHead>
              <TableHead>Comissão</TableHead>
          </TableHeader>
          <TableBody>
            {commission.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <button
                    onClick={() => router.push(`/dashboard/orders/${item.orderService.order.id}`)}
                    className="text-blue-600 hover:underline"
                  >
                    #{item.orderService.order.number}
                  </button>
                </TableCell>
                <TableCell>{item.orderService.order.client.name}</TableCell>
                <TableCell>{item.orderService.order.vehicle.model} — {item.orderService.order.vehicle.plate}</TableCell>
                <TableCell>{item.orderService.description}</TableCell>
                <TableCell>{fmt(item.baseValue)}</TableCell>
                <TableCell className="font-semibold text-green-600">{fmt(item.commissionValue)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {cancelModal && (
        <Modal isOpen onClose={() => setCancelModal(false)} title="Cancelar Comissão" size="sm">
          <div className="space-y-4">
            <Input
              label="Motivo do cancelamento"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Informe o motivo (mínimo 3 caracteres)"
              required
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setCancelModal(false)}>
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
