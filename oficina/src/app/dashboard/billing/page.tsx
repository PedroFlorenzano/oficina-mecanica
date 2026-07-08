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

const PLANS = [
  {
    id: "basic",
    name: "Básico",
    price: 250,
    features: [
      "Ordens de serviço ilimitadas",
      "Até 3 usuários",
      "Estoque com custo médio",
      "Cronômetro e comissões",
      "Relatórios + exportação PDF",
      "Suporte via e-mail",
    ],
  },
  {
    id: "professional",
    name: "Profissional",
    price: 400,
    popular: true,
    features: [
      "Tudo do Básico +",
      "Usuários ilimitados",
      "WhatsApp + aprovação digital",
      "Agendamento online",
      "NF-e e NFS-e integradas",
      "Suporte via WhatsApp",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 600,
    features: [
      "Tudo do Profissional +",
      "Multi-oficina (filiais)",
      "Marketplace de peças",
      "API personalizada",
      "Relatórios avançados",
      "Suporte prioritário",
    ],
  },
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
  // eslint-disable-next-line react-hooks/purity
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
              <h3 className="text-lg font-semibold text-slate-900">{isTrial ? "Teste Gratuito" : `Plano ${PLANS.find(p => p.id === data.plan)?.name || "Ativo"}`}</h3>
              <Badge variant={st.variant}>{st.label}</Badge>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {isTrial ? "R$ 0 (trial)" : `R$ ${PLANS.find(p => p.id === data.plan)?.price || "—"}/mês`}
            </p>
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

      {/* Planos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = data.plan === plan.id;
          return (
            <Card key={plan.id} className={`p-5 relative ${plan.popular ? "border-blue-300 ring-1 ring-blue-200" : ""} ${isCurrent ? "bg-blue-50/50" : ""}`}>
              {plan.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                  Mais popular
                </span>
              )}
              <h4 className="text-base font-semibold text-slate-900">{plan.name}</h4>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                R$ {plan.price}<span className="text-sm font-normal text-slate-500">/mês</span>
              </p>

              <ul className="mt-4 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className="w-full mt-5"
                variant={isCurrent ? "outline" : plan.popular ? "primary" : "secondary"}
                disabled={isCurrent}
                onClick={() => {
                  if (!isCurrent) alert("Integração com gateway de pagamento em breve! Entre em contato pelo suporte.");
                }}
              >
                {isCurrent ? "Plano atual" : `Assinar — R$ ${plan.price}/mês`}
              </Button>
            </Card>
          );
        })}
      </div>

      {/* Histórico */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-2">Histórico de Pagamentos</h3>
        <p className="text-sm text-slate-500">Nenhuma fatura disponível. O histórico aparecerá após a integração com gateway de pagamento.</p>
      </Card>
    </div>
  );
}
