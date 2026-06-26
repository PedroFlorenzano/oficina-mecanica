"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  MapPin,
  Package,
  PackagePlus,
  SlidersHorizontal,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/Table";
import { formatCurrency } from "@/lib/format";
import { hasPermission, parseCustomPermissions, Role } from "@/lib/permissions";

interface StockItem {
  id: string;
  code: string;
  description: string;
  brand: string | null;
  unit: string;
  quantity: number;
  minQuantity: number;
  costPrice: number;
  sellPrice: number;
  avgCost: number;
  location: string | null;
  active: boolean;
}

interface StockMovement {
  id: string;
  type: string;
  quantity: number;
  reason: string;
  document: string | null;
  supplier: string | null;
  balanceBefore: number;
  balanceAfter: number;
  stockItemId: string;
  createdAt: string;
}

interface PaginatedMovements {
  data: StockMovement[];
  total: number;
  page: number;
  pageSize: number;
}

const MOVEMENT_LABELS: Record<string, string> = {
  IN: "Entrada",
  OUT: "Saída",
  RESERVED: "Reserva",
  CONSUMPTION: "Consumo",
  REVERSAL: "Estorno",
  ADJUSTMENT: "Ajuste",
};

const MOVEMENT_COLORS: Record<string, string> = {
  IN: "text-green-700 bg-green-50",
  OUT: "text-red-700 bg-red-50",
  RESERVED: "text-amber-700 bg-amber-50",
  CONSUMPTION: "text-orange-700 bg-orange-50",
  REVERSAL: "text-blue-700 bg-blue-50",
  ADJUSTMENT: "text-purple-700 bg-purple-50",
};

export default function StockItemDetailPage() {
  const { data: session } = useSession();
  const role = (session?.user?.role ?? "MECHANIC") as Role;
  const perms = parseCustomPermissions(session?.user?.customPermissions);
  const canWrite = hasPermission(role, "stock", "create", perms) || hasPermission(role, "stock", "update", perms);

  const params = useParams();
  const id = params.id as string;

  const [item, setItem] = useState<StockItem | null>(null);
  const [movements, setMovements] = useState<PaginatedMovements | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [movLoading, setMovLoading] = useState(false);

  // Adjust modal state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustError, setAdjustError] = useState("");

  // Entry modal state
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryQty, setEntryQty] = useState("");
  const [entryCost, setEntryCost] = useState("");
  const [entrySupplier, setEntrySupplier] = useState("");
  const [entryDocument, setEntryDocument] = useState("");
  const [entryLoading, setEntryLoading] = useState(false);
  const [entryError, setEntryError] = useState("");

  const fetchItem = useCallback(async () => {
    const res = await fetch(`/api/stock/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setItem(data);
  }, [id]);

  const fetchMovements = useCallback(
    async (p: number) => {
      setMovLoading(true);
      const res = await fetch(`/api/stock/${id}/movements?page=${p}&pageSize=20`);
      if (res.ok) {
        const data = await res.json();
        setMovements(data);
      }
      setMovLoading(false);
    },
    [id]
  );

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchItem(), fetchMovements(1)]);
      setLoading(false);
    };
    init();
  }, [fetchItem, fetchMovements]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchMovements(newPage);
  };

  // Adjust handlers
  const handleOpenAdjust = () => {
    setAdjustQty(item?.quantity?.toString() ?? "");
    setAdjustReason("");
    setAdjustError("");
    setShowAdjustModal(true);
  };

  const handleAdjustSubmit = async () => {
    setAdjustLoading(true);
    setAdjustError("");
    const res = await fetch(`/api/stock/${id}/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        newQuantity: Number(adjustQty),
        reason: adjustReason,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setAdjustError(data.error || "Erro ao ajustar estoque");
      setAdjustLoading(false);
      return;
    }
    await Promise.all([fetchItem(), fetchMovements(1)]);
    setPage(1);
    setShowAdjustModal(false);
    setAdjustLoading(false);
  };

  // Entry handlers
  const handleOpenEntry = () => {
    setEntryQty("");
    setEntryCost("");
    setEntrySupplier("");
    setEntryDocument("");
    setEntryError("");
    setShowEntryModal(true);
  };

  const handleEntrySubmit = async () => {
    setEntryLoading(true);
    setEntryError("");
    const res = await fetch(`/api/stock/${id}/entry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantity: Number(entryQty),
        unitCost: Number(entryCost),
        supplier: entrySupplier.trim() || undefined,
        document: entryDocument.trim() || undefined,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setEntryError(data.error || "Erro ao registrar entrada");
      setEntryLoading(false);
      return;
    }
    await Promise.all([fetchItem(), fetchMovements(1)]);
    setPage(1);
    setShowEntryModal(false);
    setEntryLoading(false);
  };

  const newQtyNum = Number(adjustQty);
  const adjustIsNoOp = item !== null && !isNaN(newQtyNum) && newQtyNum === item.quantity;

  const isLowStock = item !== null && item.quantity <= item.minQuantity;

  const totalPages =
    movements ? Math.max(1, Math.ceil(movements.total / movements.pageSize)) : 1;

  if (loading) {
    return <div className="p-6 text-slate-500">Carregando...</div>;
  }

  if (!item) {
    return (
      <div className="p-6">
        <p className="text-red-600">Item não encontrado.</p>
        <Link
          href="/dashboard/stock"
          className="mt-4 flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={16} /> Voltar
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2">
        <Link
          href="/dashboard/stock"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4"
        >
          <ArrowLeft size={15} /> Voltar ao Estoque
        </Link>
      </div>

      <PageHeader
        title={item.description}
        description={`Código: ${item.code}${item.brand ? ` · ${item.brand}` : ""}`}
        action={
          canWrite && (
          <div className="flex gap-2">
            <button
              onClick={handleOpenEntry}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 text-sm font-medium"
            >
              <PackagePlus size={16} /> Registrar Entrada
            </button>
            <button
              onClick={handleOpenAdjust}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              <SlidersHorizontal size={16} /> Ajustar Estoque
            </button>
          </div>
          )
        }
      />

      {/* Localização em destaque */}
      {item.location && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <MapPin size={18} className="text-amber-600" />
          <span className="text-sm font-medium text-amber-800">
            Localização: <span className="font-bold">{item.location}</span>
          </span>
        </div>
      )}

      {/* Saldo atual */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className={`rounded-xl border p-4 ${isLowStock ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
          <p className="text-xs font-medium text-slate-500 mb-1">Saldo Atual</p>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${isLowStock ? "text-red-700" : "text-slate-800"}`}>
              {item.quantity}
            </span>
            <span className="text-sm text-slate-500">{item.unit}</span>
            {isLowStock && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                <AlertTriangle size={11} /> Estoque Baixo
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">Mínimo: {item.minQuantity} {item.unit}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Custo Médio</p>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(item.avgCost)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Preço de Venda</p>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(item.sellPrice)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500 mb-1">Valor em Estoque</p>
          <p className="text-2xl font-bold text-slate-800">
            {formatCurrency(item.quantity * item.avgCost)}
          </p>
        </div>
      </div>

      {/* Histórico de movimentações */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 text-sm">Histórico de Movimentações</h2>
        </div>

        {movLoading ? (
          <p className="p-6 text-slate-500 text-sm">Carregando movimentações...</p>
        ) : !movements || movements.data.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nenhuma movimentação registrada"
            description="Registre uma entrada ou ajuste de estoque para começar o histórico."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Saldo Antes</TableHead>
                <TableHead>Saldo Depois</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Motivo</TableHead>
              </TableHeader>
              <TableBody>
                {movements.data.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell className="text-slate-500 text-xs whitespace-nowrap">
                      {new Date(mov.createdAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                          MOVEMENT_COLORS[mov.type] ?? "text-slate-700 bg-slate-100"
                        }`}
                      >
                        {MOVEMENT_LABELS[mov.type] ?? mov.type}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium text-slate-800">
                      {mov.quantity} {item.unit}
                    </TableCell>
                    <TableCell className="text-slate-600">{mov.balanceBefore}</TableCell>
                    <TableCell className="text-slate-600">{mov.balanceAfter}</TableCell>
                    <TableCell className="text-slate-600 text-xs">
                      {mov.supplier || "—"}
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs">{mov.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm">
                <span className="text-slate-500">
                  Página {page} de {totalPages} · {movements.total} registros
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de ajuste */}
      <Modal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        title="Ajustar Estoque"
        size="md"
      >
        <div className="space-y-4">
          {adjustError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {adjustError}
            </div>
          )}
          <div>
            <p className="text-sm text-slate-600 mb-4">
              Saldo atual:{" "}
              <span className="font-semibold text-slate-800">
                {item.quantity} {item.unit}
              </span>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nova Quantidade *
            </label>
            <input
              type="number"
              min="0"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
            {adjustIsNoOp && (
              <p className="text-amber-600 text-xs mt-1.5">
                Nova quantidade igual ao saldo atual — nenhum ajuste necessário
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Motivo do Ajuste *
            </label>
            <input
              type="text"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Contagem física, perda, avaria..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleAdjustSubmit}
              disabled={adjustLoading || adjustIsNoOp || !adjustReason.trim() || adjustQty === ""}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {adjustLoading ? "Salvando..." : "Confirmar"}
            </button>
            <button
              type="button"
              onClick={() => setShowAdjustModal(false)}
              className="px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-100 text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de entrada */}
      <Modal
        isOpen={showEntryModal}
        onClose={() => setShowEntryModal(false)}
        title="Registrar Entrada de Estoque"
        size="md"
      >
        <div className="space-y-4">
          {entryError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {entryError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Quantidade *
              </label>
              <input
                type="number"
                min="1"
                value={entryQty}
                onChange={(e) => setEntryQty(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Custo Unitário (R$) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={entryCost}
                onChange={(e) => setEntryCost(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="0,00"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Fornecedor
            </label>
            <input
              type="text"
              value={entrySupplier}
              onChange={(e) => setEntrySupplier(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ex: Auto Peças Silva, Bosch, etc."
            />
            <p className="text-xs text-slate-400 mt-1">
              Registre o fornecedor para facilitar reclamações de garantia
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nº Nota Fiscal
            </label>
            <input
              type="text"
              value={entryDocument}
              onChange={(e) => setEntryDocument(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Ex: NF 12345"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleEntrySubmit}
              disabled={entryLoading || !entryQty || Number(entryQty) <= 0 || !entryCost || Number(entryCost) < 0}
              className="flex-1 bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {entryLoading ? "Salvando..." : "Confirmar Entrada"}
            </button>
            <button
              type="button"
              onClick={() => setShowEntryModal(false)}
              className="px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-100 text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
