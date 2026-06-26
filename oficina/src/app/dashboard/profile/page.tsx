"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Input, Button } from "@/components/ui";
import Link from "next/link";
import { User, KeyRound, BookOpen, CreditCard } from "lucide-react";

const roleLabel: Record<string, string> = {
  ADMIN: "Administrador",
  ATTENDANT: "Atendente",
  MECHANIC: "Mecânico",
};

function validateNewPassword(password: string): string | null {
  if (password.length < 8) return "A nova senha deve ter pelo menos 8 caracteres";
  if (!/[A-Z]/.test(password)) return "A nova senha deve conter ao menos uma letra maiúscula";
  if (!/[a-z]/.test(password)) return "A nova senha deve conter ao menos uma letra minúscula";
  if (!/[0-9]/.test(password)) return "A nova senha deve conter ao menos um número";
  return null;
}

function BillingCard() {
  return (
    <Link href="/dashboard/billing" className="block bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 hover:border-blue-300 transition-colors">
      <div className="flex items-center gap-2">
        <CreditCard size={18} className="text-blue-600" />
        <h2 className="text-base font-semibold text-slate-800">Minha Assinatura</h2>
        <span className="ml-auto text-sm text-blue-600 font-medium">Gerenciar →</span>
      </div>
    </Link>
  );
}

export default function ProfilePage() {
  const { data: session } = useSession();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const user = session?.user;

  function validate() {
    const errs: Record<string, string> = {};
    if (!currentPassword) errs.currentPassword = "Informe a senha atual";

    const newPwdError = validateNewPassword(newPassword);
    if (newPwdError) errs.newPassword = newPwdError;

    if (!confirmPassword) {
      errs.confirmPassword = "Confirme a nova senha";
    } else if (newPassword !== confirmPassword) {
      errs.confirmPassword = "As senhas não coincidem";
    }

    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(false);

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const res = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrors({ form: data.error ?? "Erro ao alterar senha" });
        return;
      }

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Meu Perfil</h1>

      {/* User info card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
            <User size={28} className="text-white" />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-800">{user?.name ?? "—"}</p>
            <p className="text-sm text-slate-500">{user?.email ?? "—"}</p>
            <span className="inline-block mt-1 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {roleLabel[user?.role ?? ""] ?? user?.role ?? "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Manual do Usuário (ADMIN) */}
      {user?.role === "ADMIN" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={18} className="text-blue-600" />
            <h2 className="text-base font-semibold text-slate-800">Manual do Usuário</h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">Guia completo de uso do sistema para consulta ou impressão.</p>
          <a
            href="/api/manual"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <BookOpen size={16} /> Baixar Manual (PDF)
          </a>
        </div>
      )}

      {/* Assinatura (ADMIN) */}
      {user?.role === "ADMIN" && <BillingCard />}

      {/* Password change card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound size={18} className="text-slate-500" />
          <h2 className="text-base font-semibold text-slate-800">Alterar Senha</h2>
        </div>

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
            Senha alterada com sucesso
          </div>
        )}

        {errors.form && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {errors.form}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Senha Atual"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            error={errors.currentPassword}
            required
            placeholder="••••••••"
            autoComplete="current-password"
          />

          <Input
            label="Nova Senha"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={errors.newPassword}
            required
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            hint="Deve conter maiúscula, minúscula e número"
          />

          <Input
            label="Confirmar Nova Senha"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
            required
            placeholder="••••••••"
            autoComplete="new-password"
          />

          <div className="pt-2">
            <Button type="submit" loading={loading}>
              Salvar Nova Senha
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
