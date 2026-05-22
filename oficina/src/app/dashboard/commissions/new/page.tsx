"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Button, Input, Select, Card } from "@/components/ui";

interface Mechanic {
  id: string;
  name: string;
  commissionRate: number;
}

export default function NewCommissionPage() {
  const router = useRouter();
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [mechanicId, setMechanicId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((users) =>
        setMechanics(users.filter((u: any) => u.role === "MECHANIC" && u.active))
      );
  }, []);

  const selectedMechanic = mechanics.find((m) => m.id === mechanicId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/commissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mechanicId, startDate, endDate }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erro ao gerar comissão");
      setLoading(false);
      return;
    }

    const commission = await res.json();
    router.push(`/dashboard/commissions/${commission.id}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gerar Comissão"
        description="Selecione o mecânico e o período para calcular a comissão"
      />

      <Card className="p-6 max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <Select
            label="Mecânico"
            value={mechanicId}
            onChange={(e) => setMechanicId(e.target.value)}
            options={[
              { value: "", label: "Selecione um mecânico" },
              ...mechanics.map((m) => ({ value: m.id, label: m.name })),
            ]}
            required
          />

          {selectedMechanic && (
            <p className="text-sm text-gray-600">
              Taxa de comissão atual: <span className="font-semibold">{selectedMechanic.commissionRate}%</span>
            </p>
          )}

          <Input
            label="Data Início"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />

          <Input
            label="Data Fim"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard/commissions")}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={loading} disabled={!mechanicId || !startDate || !endDate}>
              Gerar Comissão
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
