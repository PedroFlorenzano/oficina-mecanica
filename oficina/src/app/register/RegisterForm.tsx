"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";

export default function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    officeName: "",
    cnpj: "",
    phone: "",
    address: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
    confirmPassword: "",
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const maskCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 14);
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  };

  const maskPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 10) {
      return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
    }
    return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.adminPassword !== form.confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/public/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officeName: form.officeName,
          cnpj: form.cnpj,
          phone: form.phone || undefined,
          address: form.address || undefined,
          adminName: form.adminName,
          adminEmail: form.adminEmail,
          adminPassword: form.adminPassword,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Erro ao cadastrar.");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Cadastro realizado!</h2>
        <p className="text-slate-600">Redirecionando para o login...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
      <h2 className="font-semibold text-slate-800 border-b pb-2">Dados da Oficina</h2>

      <Input
        label="Nome da Oficina"
        value={form.officeName}
        onChange={set("officeName")}
        placeholder="Ex: Paiffer Bosch Car Service"
        required
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="CNPJ"
          value={form.cnpj}
          onChange={(e) => setForm((prev) => ({ ...prev, cnpj: maskCNPJ(e.target.value) }))}
          placeholder="00.000.000/0000-00"
          required
        />
        <Input
          label="Telefone"
          value={form.phone}
          onChange={(e) => setForm((prev) => ({ ...prev, phone: maskPhone(e.target.value) }))}
          placeholder="(15) 99999-9999"
        />
      </div>
      <Input
        label="Endereço"
        value={form.address}
        onChange={set("address")}
        placeholder="Rua, número, cidade - UF"
      />

      <h2 className="font-semibold text-slate-800 border-b pb-2 pt-2">Administrador</h2>

      <Input
        label="Nome completo"
        value={form.adminName}
        onChange={set("adminName")}
        placeholder="Seu nome"
        required
      />
      <Input
        label="E-mail"
        type="email"
        value={form.adminEmail}
        onChange={set("adminEmail")}
        placeholder="admin@suaoficina.com"
        required
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Senha"
          type="password"
          value={form.adminPassword}
          onChange={set("adminPassword")}
          placeholder="Mín. 8 chars, A-Z, a-z, 0-9"
          required
        />
        <Input
          label="Confirmar Senha"
          type="password"
          value={form.confirmPassword}
          onChange={set("confirmPassword")}
          required
        />
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <Button type="submit" loading={loading} className="w-full">
        Cadastrar Oficina
      </Button>
    </form>
  );
}
