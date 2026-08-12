"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign, Plus, Check, Calendar, Trash2,
  AlertTriangle, Filter, Pencil
} from "lucide-react";
import {
  Button, Badge, Card, CardHeader, CardTitle,
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
  PageHeader, EmptyState, Modal, Input, Select
} from "@/components/ui";

// ============================================
// Types
// ============================================

interface FinancialEntry {
  id: string;
  description: string;
  type: "PAYABLE" | "RECEIVABLE";
  category: string;
  status: "PENDING" | "OVERDUE" | "PAID";
  amount: number;
  dueDate: string;
  paidAt: string | null;
  paidAmount: number | null;
  installment: number;
  totalInstallments: number;
  supplier: string | null;
  notes: string | null;
}

// ============================================
// Constants
// ============================================

const CATEGORIES = [
  { value: "RENT", label: "Aluguel" },
  { value: "ENERGY", label: "Energia / Luz" },
  { value: "WATER", label: "Água" },
  { value: "INTERNET", label: "Internet / Telefone" },
  { value: "INSURANCE", label: "Seguro" },
  { value: "ACCOUNTING", label: "Contabilidade" },
  { value: "SALARY", label: "Salários" },
  { value: "PARTS_SUPPLIER", label: "Fornecedor de Peças" },
  { value: "TOOLS", label: "Ferramentas / Equipamentos" },
  { value: "MAINTENANCE", label: "Manutenção" },
  { value: "MARKETING", label: "Marketing" },
  { value: "TAX", label: "Impostos / Taxas" },
  { value: "SOFTWARE", label: "Sistemas / Licenças" },
  { value: "FUEL", label: "Combustível" },
  { value: "OTHER_FIXED", label: "Outros (fixos)" },
  { value: "OTHER_VARIABLE", label: "Outros (variáveis)" },
];

const STATUS_CONFIG = {
  PENDING: { label: "Pendente", variant: "warning" as const },
  OVERDUE: { label: "Vencido", variant: "error" as const },
  PAID: { label: "Pago", variant: "success" as const },
};

function formatMoney(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("pt-BR");
}

function getCategoryLabel(category: string): string {
  return CATEGORIES.find((c) => c.value === category)?.label || category;
}

// ============================================
// Main Page
// ============================================

export default function FinancialPage() {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null);
  const [showProrrogate, setShowProrrogate] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterCategory, setFilterCategory] = useState<string>("");

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "ALL") params.set("status", filterStatus);
      if (filterCategory) params.set("category", filterCategory);

      const res = await fetch(`/api/financial?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterCategory]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handlePay = async (id: string) => {
    if (!confirm("Confirmar baixa (marcar como pago)?")) return;
    const res = await fetch(`/api/financial/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pay" }),
    });
    if (res.ok) fetchEntries();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este lançamento?")) return;
    const res = await fetch(`/api/financial/${id}`, { method: "DELETE" });
    if (res.ok) fetchEntries();
  };

  const handleProrrogate = async (id: string, newDate: string) => {
    const res = await fetch(`/api/financial/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "prorrogate", newDueDate: newDate }),
    });
    if (res.ok) {
      setShowProrrogate(null);
      fetchEntries();
    }
  };

  // Summary cards
  const pending = entries.filter((e) => e.status === "PENDING");
  const overdue = entries.filter((e) => e.status === "OVERDUE");
  const totalPending = pending.reduce((s, e) => s + e.amount, 0);
  const totalOverdue = overdue.reduce((s, e) => s + e.amount, 0);
  const paidThisMonth = entries
    .filter((e) => {
      if (e.status !== "PAID" || !e.paidAt) return false;
      const now = new Date();
      const paid = new Date(e.paidAt);
      return paid.getMonth() === now.getMonth() && paid.getFullYear() === now.getFullYear();
    })
    .reduce((s, e) => s + (e.paidAmount || e.amount), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description="Contas a pagar, baixas e controle de vencimento"
        action={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" /> Novo Lançamento
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pendente</CardTitle>
              <Calendar className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-yellow-600">{formatMoney(totalPending)}</p>
            <p className="text-sm text-gray-500">{pending.length} conta{pending.length !== 1 ? "s" : ""}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Vencido</CardTitle>
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600">{formatMoney(totalOverdue)}</p>
            <p className="text-sm text-gray-500">{overdue.length} conta{overdue.length !== 1 ? "s" : ""}</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pago este mês</CardTitle>
              <Check className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">{formatMoney(paidThisMonth)}</p>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <Filter className="w-4 h-4 text-gray-400" />
        <Select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          label=""
          options={[
            { value: "ALL", label: "Todos os status" },
            { value: "PENDING", label: "Pendentes" },
            { value: "OVERDUE", label: "Vencidos" },
            { value: "PAID", label: "Pagos" },
          ]}
        />
        <Select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          label=""
          options={[{ value: "", label: "Todas as categorias" }, ...CATEGORIES.map((c) => ({ value: c.value, label: c.label }))]}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Carregando...</div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={DollarSign}
          title="Nenhum lançamento"
          description="Cadastre contas a pagar para controlar suas despesas."
          action={<Button onClick={() => setShowForm(true)}>Novo Lançamento</Button>}
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{entry.description}</span>
                      {entry.supplier && (
                        <p className="text-xs text-gray-500">{entry.supplier}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getCategoryLabel(entry.category)}</TableCell>
                  <TableCell>{formatDate(entry.dueDate)}</TableCell>
                  <TableCell className="font-mono">{formatMoney(entry.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_CONFIG[entry.status].variant}>
                      {STATUS_CONFIG[entry.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {entry.status !== "PAID" && (
                        <>
                          <button
                            onClick={() => handlePay(entry.id)}
                            className="p-1.5 rounded hover:bg-green-50 text-green-600"
                            title="Dar baixa"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowProrrogate(entry.id)}
                            className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                            title="Prorrogar"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingEntry(entry)}
                            className="p-1.5 rounded hover:bg-yellow-50 text-yellow-600"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-600"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Form Modal */}
      {showForm && (
        <NewEntryModal
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); fetchEntries(); }}
        />
      )}

      {/* Edit Modal */}
      {editingEntry && (
        <EditEntryModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onSuccess={() => { setEditingEntry(null); fetchEntries(); }}
        />
      )}

      {/* Prorrogate Modal */}
      {showProrrogate && (
        <ProrrogateModal
          entryId={showProrrogate}
          onClose={() => setShowProrrogate(null)}
          onProrrogate={handleProrrogate}
        />
      )}
    </div>
  );
}

// ============================================
// New Entry Modal
// ============================================

function NewEntryModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("PARTS_SUPPLIER");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [totalInstallments, setTotalInstallments] = useState("1");
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/financial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          category,
          amount: parseFloat(amount.replace(",", ".")),
          dueDate,
          totalInstallments: parseInt(totalInstallments),
          supplier: supplier || undefined,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Novo Lançamento" onClose={onClose} size="md" isOpen={true}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Descrição *"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Boleto Robert Bosch, Aluguel julho..."
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Categoria *"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
          />

          <Input
            label="Valor (R$) *"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="150,00"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Vencimento *"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />

          <Input
            label="Nº de parcelas"
            type="number"
            min="1"
            max="60"
            value={totalInstallments}
            onChange={(e) => setTotalInstallments(e.target.value)}
          />
        </div>

        <Input
          label="Fornecedor"
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
          placeholder="Ex: Robert Bosch, CPFL, Imobiliária..."
        />

        <Input
          label="Observação"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Nota adicional (opcional)"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        {parseInt(totalInstallments) > 1 && (
          <p className="text-sm text-blue-600">
            Serão geradas {totalInstallments} parcelas de {amount ? formatMoney(parseFloat(amount.replace(",", "."))) : "R$ 0,00"}, com vencimento mensal a partir de {dueDate ? formatDate(dueDate) : "..."}.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Lançar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ============================================
// Prorrogate Modal
// ============================================

function ProrrogateModal({
  entryId,
  onClose,
  onProrrogate,
}: {
  entryId: string;
  onClose: () => void;
  onProrrogate: (id: string, newDate: string) => void;
}) {
  const [newDate, setNewDate] = useState("");

  return (
    <Modal title="Prorrogar Vencimento" onClose={onClose} size="sm" isOpen={true}>
      <div className="space-y-4">
        <Input
          label="Nova data de vencimento"
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          required
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onProrrogate(entryId, newDate)} disabled={!newDate}>
            Prorrogar
          </Button>
        </div>
      </div>
    </Modal>
  );
}


// ============================================
// Edit Entry Modal
// ============================================

function EditEntryModal({ entry, onClose, onSuccess }: { entry: FinancialEntry; onClose: () => void; onSuccess: () => void }) {
  const [description, setDescription] = useState(entry.description);
  const [category, setCategory] = useState(entry.category);
  const [amount, setAmount] = useState(entry.amount.toString().replace(".", ","));
  const [dueDate, setDueDate] = useState(entry.dueDate.split("T")[0]);
  const [supplier, setSupplier] = useState(entry.supplier || "");
  const [notes, setNotes] = useState(entry.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/financial/${entry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          category,
          amount: parseFloat(amount.replace(",", ".")),
          dueDate,
          supplier: supplier || null,
          notes: notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Editar Lançamento" onClose={onClose} size="md" isOpen={true}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Descrição *"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Categoria *"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
          />
          <Input
            label="Valor (R$) *"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Vencimento *"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
          <Input
            label="Fornecedor"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          />
        </div>

        <Input
          label="Observação"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
