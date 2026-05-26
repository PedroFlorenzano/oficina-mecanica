"use client";

import { useState, useEffect } from "react";
import { X, Search } from "lucide-react";

interface Client {
  id: string;
  name: string;
  document: string;
}

interface Vehicle {
  id?: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  yearModel?: number | null;
  color?: string | null;
  fuel?: string | null;
  chassis?: string | null;
  mileage: number;
  oilReminderEnabled?: boolean;
  clientId: string;
  client?: { id: string; name: string };
}

interface Props {
  vehicle: Vehicle | null;
  onSaved: () => void;
  onCancel: () => void;
}

export default function VehicleForm({ vehicle, onSaved, onCancel }: Props) {
  const formatPlate = (value: string): string => {
    const raw = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    // Formato antigo: ABC1234 → ABC-1234
    if (raw.length >= 4 && /^[A-Z]{3}[0-9]/.test(raw) && (raw.length < 5 || /^[A-Z]{3}[0-9]{4}/.test(raw.slice(0, 7)))) {
      const letters = raw.slice(0, 3);
      const numbers = raw.slice(3, 7);
      return numbers.length > 0 ? `${letters}-${numbers}` : letters;
    }
    // Formato Mercosul: ABC1D23 (sem hífen)
    return raw.slice(0, 7);
  };

  const isValidPlate = (plate: string): boolean => {
    const raw = plate.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    // Mercosul: 3 letras + 1 número + 1 letra + 2 números
    if (/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(raw)) return true;
    // Antigo: 3 letras + 4 números
    if (/^[A-Z]{3}[0-9]{4}$/.test(raw)) return true;
    return false;
  };

  const [form, setForm] = useState({
    plate: vehicle?.plate || "",
    brand: vehicle?.brand || "",
    model: vehicle?.model || "",
    year: vehicle?.year?.toString() || "",
    yearModel: vehicle?.yearModel?.toString() || "",
    color: vehicle?.color || "",
    fuel: vehicle?.fuel || "",
    chassis: vehicle?.chassis || "",
    mileage: vehicle?.mileage?.toString() || "0",
    clientId: vehicle?.clientId || "",
    oilReminderEnabled: vehicle?.oilReminderEnabled !== false, // default true
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Client search
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState(vehicle?.client?.name || "");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [selectedClientName, setSelectedClientName] = useState(vehicle?.client?.name || "");

  useEffect(() => {
    if (clientSearch.length >= 2) {
      fetch(`/api/clients?search=${encodeURIComponent(clientSearch)}`)
        .then((res) => res.json())
        .then((data) => {
          setClients(data);
          setShowClientDropdown(true);
        });
    } else {
      setClients([]);
      setShowClientDropdown(false);
    }
  }, [clientSearch]);

  const selectClient = (client: Client) => {
    setForm({ ...form, clientId: client.id });
    setSelectedClientName(client.name);
    setClientSearch(client.name);
    setShowClientDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    if (!form.clientId) {
      setError("Selecione um cliente");
      setSaving(false);
      return;
    }

    if (!isValidPlate(form.plate)) {
      setError("Placa inválida. Use o formato Mercosul (ABC1D23) ou antigo (ABC-1234)");
      setSaving(false);
      return;
    }

    const method = vehicle?.id ? "PUT" : "POST";
    const url = vehicle?.id ? `/api/vehicles/${vehicle.id}` : "/api/vehicles";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Erro ao salvar");
      setSaving(false);
      return;
    }

    onSaved();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-800">
          {vehicle?.id ? "Editar Veículo" : "Novo Veículo"}
        </h2>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
          <X size={20} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Client search */}
        <div className="relative">
          <label className="block text-sm font-medium text-slate-700 mb-1">Cliente *</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={clientSearch}
              onChange={(e) => {
                setClientSearch(e.target.value);
                if (e.target.value !== selectedClientName) {
                  setForm({ ...form, clientId: "" });
                }
              }}
              onFocus={() => clientSearch.length >= 2 && setShowClientDropdown(true)}
              placeholder="Buscar cliente pelo nome..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {showClientDropdown && clients.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {clients.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectClient(c)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm"
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="text-slate-400 ml-2">{c.document}</span>
                </button>
              ))}
            </div>
          )}
          {form.clientId && (
            <p className="text-xs text-green-600 mt-1">✓ {selectedClientName}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Placa *</label>
            <input
              type="text"
              value={form.plate}
              onChange={(e) => setForm({ ...form, plate: formatPlate(e.target.value) })}
              required
              maxLength={8}
              placeholder="ABC1D23 ou ABC-1234"
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase ${
                form.plate.length >= 7 && !isValidPlate(form.plate) ? "border-red-300 bg-red-50" : "border-slate-300"
              }`}
            />
            {form.plate && form.plate.replace(/[^A-Z0-9]/gi, "").length === 7 && !isValidPlate(form.plate) && (
              <p className="text-xs text-red-500 mt-1">Formato inválido</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Marca *</label>
            <input
              type="text"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Modelo *</label>
            <input
              type="text"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cor</label>
            <input
              type="text"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ano Fab. *</label>
            <input
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              required
              min="1900"
              max="2099"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ano Modelo</label>
            <input
              type="number"
              value={form.yearModel}
              onChange={(e) => setForm({ ...form, yearModel: e.target.value })}
              min="1900"
              max="2099"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">KM</label>
            <input
              type="number"
              value={form.mileage}
              onChange={(e) => setForm({ ...form, mileage: e.target.value })}
              min="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Combustível</label>
            <select
              value={form.fuel}
              onChange={(e) => setForm({ ...form, fuel: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione</option>
              <option value="Gasolina">Gasolina</option>
              <option value="Etanol">Etanol</option>
              <option value="Flex">Flex</option>
              <option value="Diesel">Diesel</option>
              <option value="GNV">GNV</option>
              <option value="Elétrico">Elétrico</option>
              <option value="Híbrido">Híbrido</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Chassi</label>
            <input
              type="text"
              value={form.chassis}
              onChange={(e) => setForm({ ...form, chassis: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Lembrete de troca de óleo */}
        <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div>
            <p className="text-sm font-medium text-amber-800">Lembrete de troca de óleo</p>
            <p className="text-xs text-amber-600">Alerta quando o veículo se aproximar do intervalo de 5.000 km</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={form.oilReminderEnabled}
              onChange={(e) => setForm({ ...form, oilReminderEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-slate-300 rounded-full peer peer-checked:bg-amber-500 peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
          </label>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {saving ? "Salvando..." : vehicle?.id ? "Atualizar" : "Cadastrar"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 border border-slate-300 rounded-lg hover:bg-slate-100 text-sm"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
