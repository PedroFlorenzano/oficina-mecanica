"use client";

import { useState, useEffect } from "react";
import { PageHeader, Card, Badge, Button } from "@/components/ui";
import { CreditCard, Calendar, CheckCircle } from "lucide-react";

interface BillingData {
  name: string;
  plan: string;
  planExpiresAt: string | null;
  billingStatus: string;
}

const FEATURES = [
  "Ordens de serviço ilimitadas",
  "Usuários ilimitados",
  "Estoque com custo médio",
  "WhatsApp + aprovação digital",
  "NF-e e NFS-e integradas",
  "Cronômetro e comissões",
  "Agendamento online",
  "Relatórios + exportação PDF",
  "Multi-oficina (filiais)",
  "Suporte prioritário via WhatsApp",
];

const statusBadge: Record<string, { label: string; variant: "success" | "warning" | "error" | "default" }> = {
  active: { label: "Ativo", variant: "success" },
  past_due: { label: "Pagamento Pendente", variant: "warning" },
  suspended: { label: "Suspenso", variant: "error" },
  cancelled: { label: "Cancelado", variant: "error" },
};

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/billing").then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-500 p-6">Carregando...</p>;
  if (!data) return <p className="text-red-500 p-6">Erro ao carregar dados de billing.</p>;

  const st = statusBadge[data.billingStatus] || statusBadge.active;
  const expiresAt = data.planExpiresAt ? new Date(data.planExpiresAt) : null;
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const isTrial = data.plan === "trial";

  return (
    <div className="space-y-6">
      <PageHeader title="Assinatura" description="Gerencie seu plano Operare" />

      {/* Status atual */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-slate-900">{isTrial ? "Teste Gratuito" : "Plano Completo"}</h3>
              <Badge variant={st.variant}>{st.label}</Badge>
            </div>
            <p className="text-2xl font-bold text-blue-600">{isTrial ? "R$ 0 (trial)" : "R$ 1.500/mês"}</p>
            {expiresAt && (
              <p className="text-sm text-slate-500 mt-2 flex items-center gap-1.5">
                <Calendar size={14} />
                {isTrial
                  ? `Trial expira em ${daysLeft != null && daysLeft > 0 ? `${daysLeft} dias` : "expirado"} (${expiresAt.toLocaleDateString("pt-BR")})`
                  : `Próxima renovação: ${expiresAt.toLocaleDateString("pt-BR")}`}
              </p>
            )}
          </div>
          <CreditCard size={32} className="text-slate-300" />
        </div>
      </Card>

      {/* Plano */}
      <Card className={`p-6 ${isTrial ? "border-blue-200 bg-blue-50/30" : ""}`}>
        <h3 className="text-base font-semibold text-slate-900 mb-1">Plano Operare Completo</h3>
        <p className="text-2xl font-bold text-slate-900">R$ 1.500<span className="text-sm font-normal text-slate-500">/mês</span></p>
        <p className="text-sm text-slate-500 mt-1">Tudo incluso, sem limites</p>

        <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
          {FEATURES.map(f => (
            <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
              <CheckCircle size={14} className="text-green-500 shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        {isTrial && (
          <Button className="mt-6" onClick={() => alert("Integração com gateway de pagamento em breve! Entre em contato pelo suporte.")}>
            Assinar Plano — R$ 1.500/mês
          </Button>
        )}
      </Card>

      {/* Histórico */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-2">Histórico de Pagamentos</h3>
        <p className="text-sm text-slate-500">Nenhuma fatura disponível. O histórico aparecerá após a integração com gateway de pagamento.</p>
      </Card>
    </div>
  );
}
