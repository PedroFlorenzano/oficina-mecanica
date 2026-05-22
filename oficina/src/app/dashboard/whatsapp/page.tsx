"use client";

import { useState, useEffect } from "react";
import { PageHeader, Card, Input, Button } from "@/components/ui";
import { MessageCircle } from "lucide-react";

export default function WhatsAppConfigPage() {
  const [config, setConfig] = useState({ phoneNumberId: "", accessToken: "", businessName: "", enabled: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/whatsapp/config")
      .then((r) => r.json())
      .then((data) => { setConfig({ phoneNumberId: data.phoneNumberId || "", accessToken: data.accessToken || "", businessName: data.businessName || "", enabled: data.enabled || false }); })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await fetch("/api/whatsapp/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) return <p className="p-6 text-slate-500">Carregando...</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp Business"
        description="Configure a integração com WhatsApp para envio de notificações aos clientes"
      />

      <Card className="p-6 max-w-lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <MessageCircle className="text-green-600" size={24} />
            <div>
              <p className="font-medium text-slate-800">Status da integração</p>
              <p className={`text-sm ${config.enabled ? "text-green-600" : "text-slate-500"}`}>
                {config.enabled ? "✓ Ativa" : "Desativada"}
              </p>
            </div>
          </div>

          <Input
            label="Nome do Negócio"
            value={config.businessName}
            onChange={(e) => setConfig({ ...config, businessName: e.target.value })}
            placeholder="Paiffer Bosch Car Service"
          />

          <Input
            label="Phone Number ID (WhatsApp Business API)"
            value={config.phoneNumberId}
            onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
            placeholder="Ex: 1234567890"
            hint="Obtido no painel Meta Business"
          />

          <Input
            label="Access Token"
            type="password"
            value={config.accessToken}
            onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
            placeholder="Token de acesso da API"
            hint="Token permanente gerado no Meta Business"
          />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              className="w-4 h-4 rounded border-slate-300"
            />
            <span className="text-sm text-slate-700">Habilitar envio de mensagens</span>
          </label>

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" loading={saving}>Salvar Configuração</Button>
            {saved && <span className="text-sm text-green-600">✓ Salvo</span>}
          </div>
        </form>
      </Card>
    </div>
  );
}
