"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Settings, Save, Check } from "lucide-react";

interface TenantSettings {
  allowEditInProgress: boolean;
  uppercaseInputs: boolean;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [settings, setSettings] = useState<TenantSettings>({
    allowEditInProgress: false,
    uppercaseInputs: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: TenantSettings) => {
        if (!cancelled) {
          setSettings(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Erro ao carregar configurações");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    if (!isAdmin) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Erro ao salvar configurações");
      }
      const data: TenantSettings = await res.json();
      setSettings(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-slate-500">Carregando configurações...</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
          <Settings size={20} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Configurações da Oficina</h1>
          <p className="text-sm text-slate-500">
            Ajustes que valem para toda a oficina.
          </p>
        </div>
      </div>

      {!isAdmin && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          Somente administradores podem alterar estas configurações. Você pode visualizá-las.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* allowEditInProgress */}
        <label
          className={`flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 ${
            isAdmin ? "cursor-pointer hover:border-slate-300" : "opacity-70"
          }`}
        >
          <input
            type="checkbox"
            data-no-uppercase
            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
            checked={settings.allowEditInProgress}
            disabled={!isAdmin}
            onChange={(e) =>
              setSettings((s) => ({ ...s, allowEditInProgress: e.target.checked }))
            }
          />
          <div>
            <p className="text-sm font-medium text-slate-800">
              Permitir editar Ordens de Serviço em andamento
            </p>
            <p className="text-sm text-slate-500 mt-0.5">
              Quando ligado, serviços e peças de uma OS que já está{" "}
              <strong>Em andamento</strong> ainda podem ser alterados. Desligado,
              a OS fica travada para edição depois que o trabalho começa,
              evitando mudanças acidentais durante a execução.
            </p>
          </div>
        </label>

        {/* uppercaseInputs */}
        <label
          className={`flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 ${
            isAdmin ? "cursor-pointer hover:border-slate-300" : "opacity-70"
          }`}
        >
          <input
            type="checkbox"
            data-no-uppercase
            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
            checked={settings.uppercaseInputs}
            disabled={!isAdmin}
            onChange={(e) =>
              setSettings((s) => ({ ...s, uppercaseInputs: e.target.checked }))
            }
          />
          <div>
            <p className="text-sm font-medium text-slate-800">
              Digitar tudo em MAIÚSCULAS
            </p>
            <p className="text-sm text-slate-500 mt-0.5">
              Quando ligado, os campos de texto do sistema passam a gravar o que
              for digitado em letras maiúsculas automaticamente. Campos de{" "}
              <strong>senha</strong> e <strong>e-mail</strong> não são afetados.
            </p>
          </div>
        </label>
      </div>

      {isAdmin && (
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saved ? <Check size={16} /> : <Save size={16} />}
            {saving ? "Salvando..." : saved ? "Salvo" : "Salvar alterações"}
          </button>
        </div>
      )}
    </div>
  );
}
