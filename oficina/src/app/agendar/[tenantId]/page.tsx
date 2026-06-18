"use client";

import { useState, useEffect, use } from "react";

interface Slot {
  time: string;
  available: boolean;
}

interface TenantInfo {
  name: string;
  phone: string | null;
  address: string | null;
}

export default function AgendarPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [workDays, setWorkDays] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    clientName: "",
    clientPhone: "",
    vehicleInfo: "",
    description: "",
  });

  // Set initial date to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedDate(tomorrow.toISOString().split("T")[0]);
  }, []);

  useEffect(() => {
    if (!selectedDate) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setSelectedTime("");
    fetch(`/api/public/schedule/${tenantId}?date=${selectedDate}`)
      .then((r) => {
        if (!r.ok) throw new Error("Não disponível");
        return r.json();
      })
      .then((data) => {
        setTenant(data.tenant);
        setSlots(data.slots);
        setWorkDays(JSON.parse(data.config.workDays));
      })
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [selectedDate, tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selectedTime) { setError("Selecione um horário."); return; }

    setSubmitting(true);
    try {
      const dateTime = `${selectedDate}T${selectedTime}:00`;
      const res = await fetch(`/api/public/schedule/${tenantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, date: dateTime }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao agendar.");
        return;
      }
      setSuccess(true);
    } finally {
      setSubmitting(false);
    }
  };

  const isWorkDay = (dateStr: string) => {
    if (!workDays.length) return true;
    const day = new Date(dateStr + "T12:00:00").getDay();
    return workDays.includes(day);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Agendamento confirmado!</h2>
          <p className="text-slate-600">
            {selectedDate.split("-").reverse().join("/")} às {selectedTime}
          </p>
          <p className="text-sm text-slate-500 mt-4">A oficina entrará em contato para confirmar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          {tenant && <h1 className="text-xl font-bold text-slate-900">{tenant.name}</h1>}
          <p className="text-slate-500 text-sm">Agende seu atendimento online</p>
          {tenant?.address && <p className="text-xs text-slate-400 mt-1">{tenant.address}</p>}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          {/* Date picker */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="border rounded-lg px-3 py-2 w-full text-sm"
              required
            />
            {selectedDate && !isWorkDay(selectedDate) && (
              <p className="text-xs text-orange-600 mt-1">Esta oficina não atende neste dia.</p>
            )}
          </div>

          {/* Time slots */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Horário</label>
            {loading ? (
              <div className="animate-pulse h-20 bg-slate-100 rounded" />
            ) : slots.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhum horário disponível nesta data.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => setSelectedTime(slot.time)}
                    className={`px-2 py-2 rounded text-sm font-medium transition-colors ${
                      selectedTime === slot.time
                        ? "bg-blue-600 text-white"
                        : slot.available
                        ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        : "bg-slate-50 text-slate-300 cursor-not-allowed line-through"
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Client info */}
          <div className="border-t pt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Seu nome</label>
              <input
                type="text"
                value={form.clientName}
                onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))}
                placeholder="Nome completo"
                className="border rounded-lg px-3 py-2 w-full text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Telefone (WhatsApp)</label>
              <input
                type="tel"
                value={form.clientPhone}
                onChange={(e) => setForm((f) => ({ ...f, clientPhone: e.target.value }))}
                placeholder="(11) 99999-9999"
                className="border rounded-lg px-3 py-2 w-full text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Veículo</label>
              <input
                type="text"
                value={form.vehicleInfo}
                onChange={(e) => setForm((f) => ({ ...f, vehicleInfo: e.target.value }))}
                placeholder="Ex: Honda Civic 2020 - ABC1D23"
                className="border rounded-lg px-3 py-2 w-full text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">O que precisa?</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descreva o problema ou serviço desejado"
                rows={3}
                className="border rounded-lg px-3 py-2 w-full text-sm resize-none"
                required
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting || !selectedTime}
            className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Agendando..." : "Confirmar Agendamento"}
          </button>
        </form>
      </div>
    </div>
  );
}
