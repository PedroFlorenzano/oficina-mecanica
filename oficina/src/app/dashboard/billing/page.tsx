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

const PLANS: Record<string, { label: string; price: string; features: string[] }> = {
  trial: { label: "Teste Gratuito", price: "R$ 0", features: ["15 dias de acesso", "Todos os módulos", "Suporte por WhatsApp"] },
  basic: { label: "Básico", price: "R$ 149/mês", features: ["Clientes e veículos", "Ordens de serviço", "Estoque", "1 usuário"] },
  professional: { label: "Profissional", price: "R$ 299/mês", features: ["Tudo do Básico", "NF-e e NFS-e", "WhatsApp", "Comissões", "5 usuários"] },
  enterprise: { label: "Enterprise", price: "Sob consulta", features: ["Tudo do Profissional", "Usuários ilimitados", "Suporte prioritário", "Customizações"] },
};

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

  const plan = PLANS[data.plan] || PLANS.trial;
  const st = statusBadge[data.billingStatus] || statusBadge.active;
  const expiresAt = data.planExpiresAt ? new Date(data.planExpiresAt) : null;
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Assinatura e Billing" description="Gerencie seu plano e pagamentos" />

      {/* Plano Atual */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-slate-900">{plan.label}</h3>
              <Badge variant={st.variant}>{st.label}</Badge>
            </div>
            <p className="text-2xl font-bold text-blue-600">{plan.price}</p>
            {expiresAt && (
              <p className="text-sm text-slate-500 mt-2 flex items-center gap-1.5">
                <Calendar size={14} />
                {data.plan === "trial"
                  ? `Trial expira em ${daysLeft != null && daysLeft > 0 ? `${daysLeft} dias` : "expirado"} (${expiresAt.toLocaleDateString("pt-BR")})`
                  : `Próxima renovação: ${expiresAt.toLocaleDateString("pt-BR")}`}
              </p>
            )}
          </div>
          <CreditCard size={32} className="text-slate-300" />
        </div>
        <ul className="mt-4 space-y-1.5">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle size={14} className="text-green-500" />
              {f}
            </li>
          ))}
        </ul>
      </Card>

      {/* Upgrade */}
      {data.plan === "trial" || data.plan === "basic" ? (
        <Card className="p-6 border-blue-200 bg-blue-50/50">
          <h3 className="text-base font-semibold text-slate-900 mb-2">Fazer upgrade</h3>
          <p className="text-sm text-slate-600 mb-4">Desbloqueie mais funcionalidades com um plano superior.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(PLANS).filter(([k]) => k !== "trial" && k !== data.plan).map(([key, p]) => (
              <div key={key} className="bg-white rounded-lg border border-slate-200 p-4">
                <h4 className="font-semibold text-slate-900">{p.label}</h4>
                <p className="text-lg font-bold text-blue-600 mt-1">{p.price}</p>
                <ul className="mt-2 space-y-1">
                  {p.features.slice(0, 3).map((f, i) => (
                    <li key={i} className="text-xs text-slate-500 flex items-center gap-1"><CheckCircle size={10} className="text-green-500" />{f}</li>
                  ))}
                </ul>
                <Button variant="primary" className="mt-3 w-full" onClick={() => alert("Integração com gateway de pagamento em breve!")}>
                  Assinar {p.label}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {/* Histórico (placeholder) */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-2">Histórico de Pagamentos</h3>
        <p className="text-sm text-slate-500">Nenhuma fatura disponível. O histórico aparecerá quando a integração com gateway de pagamento estiver ativa.</p>
      </Card>
    </div>
  );
}
