"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Calendar, Check, X, Clock, ExternalLink } from "lucide-react";
import { Button, PageHeader, Badge, Card, CardHeader, CardTitle } from "@/components/ui";

interface Appointment {
  id: string;
  clientName: string;
  clientPhone: string;
  vehicleInfo: string;
  description: string;
  date: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  notes: string | null;
}

interface Config {
  enabled: boolean;
  slotDuration: number;
  maxPerSlot: number;
  workDays: string;
  startTime: string;
  endTime: string;
  lunchStart: string | null;
  lunchEnd: string | null;
}

const statusMap: Record<string, { label: string; variant: "warning" | "info" | "error" | "success" }> = {
  PENDING: { label: "Pendente", variant: "warning" },
  CONFIRMED: { label: "Confirmado", variant: "info" },
  CANCELLED: { label: "Cancelado", variant: "error" },
  COMPLETED: { label: "Concluído", variant: "success" },
};

export default function AppointmentsPage() {
  const { data: session } = useSession();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [saving, setSaving] = useState(false);

  const tenantId = session?.user?.tenantId || "";
  const isAdmin = session?.user?.role === "ADMIN";
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/agendar/${tenantId}` : "";

  useEffect(() => {
    Promise.all([
      fetch("/api/appointments").then((r) => r.json()),
      fetch("/api/appointments/config").then((r) => r.json()),
    ]).then(([appts, cfg]) => {
      setAppointments(appts);
      setConfig(cfg);
    }).finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
    }
  };

  const saveConfig = async (newConfig: Partial<Config>) => {
    setSaving(true);
    const res = await fetch("/api/appointments/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newConfig),
    });
    if (res.ok) setConfig(await res.json());
    setSaving(false);
  };

  const pendingCount = appointments.filter((a) => a.status === "PENDING").length;
  const todayCount = appointments.filter((a) => {
    const today = new Date().toISOString().split("T")[0];
    return a.date.startsWith(today) && a.status !== "CANCELLED";
  }).length;

  if (loading) return <div className="animate-pulse h-64 bg-slate-100 rounded-xl" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agendamentos"
        description="Gerencie os agendamentos online da oficina"
        action={
          isAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowConfig(!showConfig)}>
                Configurar
              </Button>
              {config?.enabled && (
                <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(publicUrl)}>
                  <ExternalLink className="w-4 h-4 mr-1" /> Copiar Link
                </Button>
              )}
            </div>
          )
        }
      />

      {/* Config panel */}
      {showConfig && isAdmin && config && (
        <Card>
          <CardHeader><CardTitle>Configuração do Agendamento</CardTitle></CardHeader>
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Habilitado:</label>
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => saveConfig({ enabled: e.target.checked })}
                className="rounded"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-slate-500">Duração do slot (min)</label>
                <input type="number" value={config.slotDuration} onChange={(e) => setConfig((c) => c ? { ...c, slotDuration: +e.target.value } : c)} className="border rounded px-2 py-1 w-full text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Máx. por slot</label>
                <input type="number" value={config.maxPerSlot} onChange={(e) => setConfig((c) => c ? { ...c, maxPerSlot: +e.target.value } : c)} className="border rounded px-2 py-1 w-full text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Início</label>
                <input type="time" value={config.startTime} onChange={(e) => setConfig((c) => c ? { ...c, startTime: e.target.value } : c)} className="border rounded px-2 py-1 w-full text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Fim</label>
                <input type="time" value={config.endTime} onChange={(e) => setConfig((c) => c ? { ...c, endTime: e.target.value } : c)} className="border rounded px-2 py-1 w-full text-sm" />
              </div>
            </div>
            <Button size="sm" loading={saving} onClick={() => saveConfig(config)}>Salvar</Button>
            {config.enabled && (
              <p className="text-xs text-slate-500">
                Link público: <a href={publicUrl} target="_blank" className="text-blue-600 underline">{publicUrl}</a>
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4 text-center">
          <Clock className="w-5 h-5 mx-auto text-yellow-500 mb-1" />
          <p className="text-2xl font-bold">{pendingCount}</p>
          <p className="text-xs text-slate-500">Pendentes</p>
        </div>
        <div className="bg-white rounded-lg border p-4 text-center">
          <Calendar className="w-5 h-5 mx-auto text-blue-500 mb-1" />
          <p className="text-2xl font-bold">{todayCount}</p>
          <p className="text-xs text-slate-500">Hoje</p>
        </div>
      </div>

      {/* Appointments list */}
      <div className="space-y-3">
        {appointments.length === 0 ? (
          <p className="text-center text-slate-400 py-12">Nenhum agendamento registrado.</p>
        ) : (
          appointments.map((appt) => {
            const { label, variant } = statusMap[appt.status];
            const dateObj = new Date(appt.date);
            return (
              <div key={appt.id} className="bg-white rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-900">{appt.clientName}</span>
                      <Badge variant={variant}>{label}</Badge>
                    </div>
                    <p className="text-sm text-slate-600">{appt.vehicleInfo}</p>
                    <p className="text-sm text-slate-500 mt-1">{appt.description}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      📅 {dateObj.toLocaleDateString("pt-BR")} às {dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      {" • "} 📱 {appt.clientPhone}
                    </p>
                  </div>
                  {appt.status === "PENDING" && (
                    <div className="flex gap-1">
                      <button onClick={() => updateStatus(appt.id, "CONFIRMED")} className="p-2 rounded-lg hover:bg-green-50 text-green-600" title="Confirmar">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => updateStatus(appt.id, "CANCELLED")} className="p-2 rounded-lg hover:bg-red-50 text-red-600" title="Cancelar">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {appt.status === "CONFIRMED" && (
                    <button onClick={() => updateStatus(appt.id, "COMPLETED")} className="p-2 rounded-lg hover:bg-green-50 text-green-600" title="Concluir">
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
