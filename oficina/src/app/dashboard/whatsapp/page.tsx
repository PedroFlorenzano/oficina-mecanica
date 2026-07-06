"use client";

import { useState, useEffect } from "react";
import { PageHeader, Card, Input, Button } from "@/components/ui";
import { MessageCircle, FileText } from "lucide-react";

const DEFAULT_TEMPLATES = {
  msgStatusUpdate: `🔧 *{oficina}*\n\nOlá, {cliente}!\nSua OS *#{os}* ({veiculo} - {placa}) teve o status atualizado para:\n\n📋 *{status}*\n\nQualquer dúvida, entre em contato conosco!`,
  msgDeliveryReady: `✅ *{oficina}*\n\nOlá, {cliente}!\nSeu veículo {veiculo} ({placa}) está pronto para retirada.\n\nOS #{os}\n\nPara confirmar o recebimento, acesse:\n{link}\n\nLink válido por 48h.`,
  msgOilReminder: `🛢️ *Lembrete de Troca de Óleo*\n\nOlá, {cliente}!\n\nSeu veículo *{veiculo}* ({placa}) está próximo ou já ultrapassou o prazo da troca de óleo.\n\nAgende sua revisão! 📞\n{oficina}`,
  msgAppointment: `📅 *{oficina}*\n\nOlá, {cliente}!\nSeu agendamento está confirmado:\n\n🚗 Veículo: {veiculo}\n📆 Data: {data}\n⏰ Horário: {horario}\n\nCaso precise reagendar, entre em contato!`,
  msgBirthday: `🎂 *{oficina}*\n\nOlá, {cliente}!\n\nFeliz aniversário! 🎉\nDesejamos saúde e muitas estradas pela frente.\n\nComo presente, você tem 10% de desconto em serviços este mês! 🎁`,
  msgReturnReminder: `🔧 *{oficina}*\n\nOlá, {cliente}!\n\nJá faz um tempo desde a última revisão do seu *{veiculo}* ({placa}).\n\nQue tal agendar uma visita preventiva? Cuidar do carro regularmente evita surpresas e custos maiores.\n\nAguardamos você! 📞`,
};

type TemplateKey = keyof typeof DEFAULT_TEMPLATES;

const TEMPLATE_LABELS: Record<TemplateKey, { label: string; description: string; variables: string }> = {
  msgStatusUpdate: {
    label: "Atualização de Status da OS",
    description: "Enviado quando o status da OS muda (em serviço, aguardando peça, etc.)",
    variables: "{cliente}, {veiculo}, {placa}, {os}, {oficina}, {status}",
  },
  msgDeliveryReady: {
    label: "Veículo Pronto para Retirada",
    description: "Enviado quando a OS é concluída e o veículo pode ser retirado",
    variables: "{cliente}, {veiculo}, {placa}, {os}, {oficina}, {link}",
  },
  msgOilReminder: {
    label: "Lembrete de Troca de Óleo",
    description: "Enviado quando o veículo atinge a quilometragem ou tempo para troca",
    variables: "{cliente}, {veiculo}, {placa}, {oficina}",
  },
  msgAppointment: {
    label: "Confirmação de Agendamento",
    description: "Enviado quando um agendamento é criado ou confirmado",
    variables: "{cliente}, {veiculo}, {oficina}, {data}, {horario}",
  },
  msgBirthday: {
    label: "Feliz Aniversário",
    description: "Enviado no dia do aniversário do cliente",
    variables: "{cliente}, {oficina}",
  },
  msgReturnReminder: {
    label: "Lembrete de Retorno",
    description: "Enviado após X dias sem visita, convidando o cliente a voltar",
    variables: "{cliente}, {veiculo}, {placa}, {oficina}",
  },
};

function WhatsAppConnection() {
  const [state, setState] = useState<"loading" | "not_created" | "connecting" | "open" | "close">("loading");
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const fetchState = async () => {
    try {
      const res = await fetch("/api/whatsapp/instance");
      const data = await res.json();
      setState(data.state || "not_created");
      setQrcode(data.qrcode || null);
    } catch {
      setState("not_created");
    }
  };

  useEffect(() => { fetchState(); }, []);

  // Polling para verificar conexão enquanto mostra QR
  useEffect(() => {
    if (state !== "connecting") return;
    const interval = setInterval(async () => {
      const res = await fetch("/api/whatsapp/instance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "check" }) });
      const data = await res.json();
      if (data.state === "open") {
        setState("open");
        setQrcode(null);
        clearInterval(interval);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [state]);

  const handleCreate = async () => {
    setCreating(true);
    setError("");
    const res = await fetch("/api/whatsapp/instance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create" }),
    });
    const data = await res.json();
    if (res.ok) {
      setState("connecting");
      setQrcode(data.qrcode || null);
      if (!data.qrcode) {
        // Instância já existia, buscar QR
        const res2 = await fetch("/api/whatsapp/instance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "connect" }) });
        const data2 = await res2.json();
        setQrcode(data2.qrcode || null);
      }
    } else {
      setError(data.error || "Erro ao criar instância");
    }
    setCreating(false);
  };

  const handleReconnect = async () => {
    setError("");
    const res = await fetch("/api/whatsapp/instance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "connect" }),
    });
    const data = await res.json();
    if (res.ok) {
      setState("connecting");
      setQrcode(data.qrcode || null);
    } else {
      setError(data.error || "Erro ao reconectar");
    }
  };

  if (state === "loading") return <p className="text-sm text-slate-500">Verificando conexão...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <MessageCircle className={state === "open" ? "text-green-600" : "text-slate-400"} size={24} />
        <div>
          <p className="font-medium text-slate-800">WhatsApp</p>
          <p className={`text-sm ${state === "open" ? "text-green-600" : state === "connecting" ? "text-amber-600" : "text-slate-500"}`}>
            {state === "open" && "✓ Conectado e ativo"}
            {state === "connecting" && "⏳ Aguardando leitura do QR Code..."}
            {state === "close" && "✗ Desconectado"}
            {state === "not_created" && "Não configurado"}
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}

      {state === "not_created" && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <p className="text-sm text-slate-700 mb-3">
            Clique abaixo para ativar o WhatsApp. Um QR Code será gerado para você escanear com o celular da oficina.
          </p>
          <Button onClick={handleCreate} loading={creating}>
            Ativar WhatsApp
          </Button>
        </div>
      )}

      {state === "connecting" && qrcode && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 text-center">
          <p className="text-sm text-slate-700 mb-3">
            Abra o WhatsApp no celular → Configurações → Aparelhos Conectados → Conectar Aparelho
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrcode} alt="QR Code WhatsApp" className="mx-auto w-64 h-64 border rounded" />
          <p className="text-xs text-slate-500 mt-3">O QR Code atualiza automaticamente. A página detecta quando conectar.</p>
        </div>
      )}

      {state === "connecting" && !qrcode && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">Aguardando QR Code... Recarregue a página se não aparecer em 10 segundos.</p>
        </div>
      )}

      {state === "open" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            ✓ WhatsApp conectado! As mensagens automáticas (status da OS, lembretes, etc.) serão enviadas por este número.
          </p>
          <p className="text-xs text-green-700 mt-2">Grupos são ignorados automaticamente. Ligações são rejeitadas com mensagem.</p>
        </div>
      )}

      {state === "close" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800 mb-3">A conexão foi perdida. Escaneie o QR Code novamente para reconectar.</p>
          <Button onClick={handleReconnect} variant="outline">Reconectar</Button>
        </div>
      )}
    </div>
  );
}

export default function WhatsAppConfigPage() {
  const [tab, setTab] = useState<"config" | "templates">("config");
  const [config, setConfig] = useState({ phoneNumberId: "", accessToken: "", businessName: "", enabled: false });
  const [templates, setTemplates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/whatsapp/config")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => {
        setConfig({
          phoneNumberId: data.phoneNumberId || "",
          accessToken: data.accessToken || "",
          businessName: data.businessName || "",
          enabled: data.enabled || false,
        });
        setTemplates({
          msgStatusUpdate: data.msgStatusUpdate || "",
          msgDeliveryReady: data.msgDeliveryReady || "",
          msgOilReminder: data.msgOilReminder || "",
          msgAppointment: data.msgAppointment || "",
          msgBirthday: data.msgBirthday || "",
          msgReturnReminder: data.msgReturnReminder || "",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const body = tab === "config" ? config : { ...templates };
    await fetch("/api/whatsapp/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const resetTemplate = (key: TemplateKey) => {
    setTemplates({ ...templates, [key]: DEFAULT_TEMPLATES[key] });
  };

  if (loading) return <p className="p-6 text-slate-500">Carregando...</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp Business"
        description="Configure a integração e personalize as mensagens enviadas aos clientes"
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab("config")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition ${tab === "config" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
        >
          <MessageCircle className="inline w-4 h-4 mr-1.5 -mt-0.5" />
          Conexão
        </button>
        <button
          onClick={() => setTab("templates")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition ${tab === "templates" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
        >
          <FileText className="inline w-4 h-4 mr-1.5 -mt-0.5" />
          Mensagens
        </button>
      </div>

      {tab === "config" && (
        <Card className="p-6 max-w-lg">
          <WhatsAppConnection />
        </Card>
      )}

      {tab === "templates" && (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-3xl">
            <p className="text-sm text-blue-800 font-medium">Variáveis disponíveis</p>
            <p className="text-xs text-blue-700 mt-1">
              Use estas variáveis no texto — elas serão substituídas automaticamente ao enviar:
              <span className="font-mono"> {"{cliente}"} {"{veiculo}"} {"{placa}"} {"{os}"} {"{oficina}"} {"{status}"} {"{link}"} {"{data}"} {"{horario}"}</span>
            </p>
          </div>

          {(Object.keys(TEMPLATE_LABELS) as TemplateKey[]).map((key) => (
            <Card key={key} className="p-5 max-w-3xl">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-slate-900 text-sm">{TEMPLATE_LABELS[key].label}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{TEMPLATE_LABELS[key].description}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Variáveis: <span className="font-mono">{TEMPLATE_LABELS[key].variables}</span></p>
                </div>
                <button
                  type="button"
                  onClick={() => resetTemplate(key)}
                  className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap"
                >
                  Restaurar padrão
                </button>
              </div>
              <textarea
                value={templates[key] || ""}
                onChange={(e) => setTemplates({ ...templates, [key]: e.target.value })}
                placeholder={DEFAULT_TEMPLATES[key]}
                rows={5}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
              />
            </Card>
          ))}

          <div className="flex items-center gap-3 pt-2 max-w-3xl">
            <Button type="submit" loading={saving}>Salvar Templates</Button>
            {saved && <span className="text-sm text-green-600">✓ Salvo</span>}
          </div>
        </form>
      )}
    </div>
  );
}
