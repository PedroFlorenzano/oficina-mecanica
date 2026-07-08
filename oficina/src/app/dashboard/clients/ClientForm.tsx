"use client";

import { useState } from "react";
import { X, Search, Loader2 } from "lucide-react";

interface Client {
  id?: string;
  name: string;
  document: string;
  docType: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

interface Props {
  client: Client | null;
  onSaved: () => void;
  onCancel: () => void;
}

export default function ClientForm({ client, onSaved, onCancel }: Props) {
  const [form, setForm] = useState({
    name: client?.name || "",
    document: client?.document || "",
    phone: client?.phone || "",
    email: client?.email || "",
    cep: "",
    address: client?.address || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [cpfLoading, setCpfLoading] = useState(false);
  const [cpfMsg, setCpfMsg] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepMsg, setCepMsg] = useState("");

  // Buscar dados por CPF/CNPJ
  const handleDocumentSearch = async () => {
    const cleaned = form.document.replace(/\D/g, "");
    if (!cleaned) return;

    setCpfLoading(true);
    setCpfMsg("");

    try {
      if (cleaned.length === 11) {
        // CPF — buscar na BrasilAPI
        const res = await fetch(`https://brasilapi.com.br/api/cpf/v1/${cleaned}`);
        if (res.ok) {
          const data = await res.json();
          if (data.nome) {
            setForm((f) => ({ ...f, name: data.nome }));
            setCpfMsg("✓ Nome preenchido automaticamente");
          }
        } else {
          setCpfMsg("CPF não encontrado na base pública");
        }
      } else if (cleaned.length === 14) {
        // CNPJ — buscar na BrasilAPI
        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleaned}`);
        if (res.ok) {
          const data = await res.json();
          setForm((f) => ({
            ...f,
            name: data.razao_social || data.nome_fantasia || f.name,
            phone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1.slice(0, 2)}) ${data.ddd_telefone_1.slice(2)}` : f.phone,
            email: data.email || f.email,
            cep: data.cep || f.cep,
            address: data.logradouro
              ? `${data.logradouro}, ${data.numero || "S/N"} - ${data.bairro}, ${data.municipio}/${data.uf} - CEP ${data.cep}`
              : f.address,
          }));
          setCpfMsg("✓ Dados da empresa preenchidos automaticamente");
        } else {
          setCpfMsg("CNPJ não encontrado");
        }
      } else {
        setCpfMsg("Digite um CPF (11 dígitos) ou CNPJ (14 dígitos)");
      }
    } catch {
      setCpfMsg("Erro ao consultar. Tente novamente.");
    }
    setCpfLoading(false);
  };

  // Buscar endereço por CEP
  const handleCepSearch = async () => {
    const cleaned = form.cep.replace(/\D/g, "");
    if (cleaned.length !== 8) {
      setCepMsg("CEP deve ter 8 dígitos");
      return;
    }

    setCepLoading(true);
    setCepMsg("");

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      if (res.ok) {
        const data = await res.json();
        if (data.erro) {
          setCepMsg("CEP não encontrado");
        } else {
          const endereco = `${data.logradouro || ""}, ${data.bairro || ""} - ${data.localidade}/${data.uf} - CEP ${data.cep}`;
          setForm((f) => ({ ...f, address: endereco }));
          setCepMsg("✓ Endereço preenchido automaticamente");
        }
      } else {
        setCepMsg("Erro ao buscar CEP");
      }
    } catch {
      setCepMsg("Erro de conexão. Tente novamente.");
    }
    setCepLoading(false);
  };

  // Trigger busca CEP ao sair do campo com 8+ dígitos
  const handleCepBlur = () => {
    const cleaned = form.cep.replace(/\D/g, "");
    if (cleaned.length === 8) handleCepSearch();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const method = client?.id ? "PUT" : "POST";
    const url = client?.id ? `/api/clients/${client.id}` : "/api/clients";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        document: form.document,
        phone: form.phone,
        email: form.email,
        address: form.address,
      }),
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
          {client?.id ? "Editar Cliente" : "Novo Cliente"}
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
        {/* CPF/CNPJ com busca */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">CPF / CNPJ *</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.document}
              onChange={(e) => setForm({ ...form, document: e.target.value })}
              required
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleDocumentSearch}
              disabled={cpfLoading}
              className="px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50"
              title="Buscar dados pelo CPF/CNPJ"
            >
              {cpfLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            </button>
          </div>
          {cpfMsg && (
            <p className={`text-xs mt-1 ${cpfMsg.startsWith("✓") ? "text-green-600" : "text-amber-600"}`}>
              {cpfMsg}
            </p>
          )}
        </div>

        {/* Nome */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nome / Razão Social *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Telefone + Email */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(00) 00000-0000"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* CEP com busca */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">CEP</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.cep}
              onChange={(e) => setForm({ ...form, cep: e.target.value })}
              onBlur={handleCepBlur}
              placeholder="00000-000"
              className="w-40 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleCepSearch}
              disabled={cepLoading}
              className="px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50"
              title="Buscar endereço pelo CEP"
            >
              {cepLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            </button>
          </div>
          {cepMsg && (
            <p className={`text-xs mt-1 ${cepMsg.startsWith("✓") ? "text-green-600" : "text-amber-600"}`}>
              {cepMsg}
            </p>
          )}
        </div>

        {/* Endereço */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Preenchido automaticamente pelo CEP"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {saving ? "Salvando..." : client?.id ? "Atualizar" : "Cadastrar"}
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
