import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-slate-900">Operare</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 font-medium">
              Entrar
            </Link>
            <Link href="/register" className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">
              Começar Grátis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight max-w-3xl mx-auto">
          Gestão completa para sua oficina mecânica
        </h1>
        <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
          Ordens de serviço, estoque, financeiro, WhatsApp, NF-e e muito mais.
          Tudo em um único sistema pensado para oficinas brasileiras.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link href="/register" className="bg-blue-600 text-white px-6 py-3 rounded-lg text-base font-semibold hover:bg-blue-700 shadow-sm">
            Testar 15 dias grátis
          </Link>
          <Link href="/planos" className="border border-slate-300 text-slate-700 px-6 py-3 rounded-lg text-base font-medium hover:bg-slate-50">
            Ver Planos
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-400">Sem cartão de crédito. Cancele quando quiser.</p>
      </section>

      {/* Features */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-12">Tudo que sua oficina precisa</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: "Ordens de Serviço", desc: "Reclamações do cliente, serviços, peças. PDF do orçamento e aprovação via WhatsApp." },
              { title: "Controle de Estoque", desc: "Custo médio ponderado, alertas de mínimo, fornecedor, histórico imutável." },
              { title: "WhatsApp Integrado", desc: "Envio de orçamento, aprovação digital pelo cliente e lembretes preventivos automáticos." },
              { title: "Pista (Kanban)", desc: "Acompanhe as OS em tempo real com drag-and-drop por status e mecânico." },
              { title: "Comissões", desc: "Cálculo automático por mecânico, aprovação pelo admin, histórico completo." },
              { title: "NF-e / NFS-e", desc: "Emissão de nota fiscal integrada à OS. DANFE em PDF com um clique." },
              { title: "Cronômetro de Serviço", desc: "Tempo real por mecânico em cada serviço. Controle de produtividade." },
              { title: "Agendamento Online", desc: "Link público para o cliente agendar. Configurável por dia e horário." },
              { title: "Multi-Oficina", desc: "Dados 100% isolados entre oficinas. Cada uma com seus usuários e dados." },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-xl p-6 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Simples e transparente</h2>
          <p className="text-slate-600 mb-10">Um plano completo com tudo incluso. Sem surpresas.</p>

          <div className="bg-white border-2 border-blue-600 rounded-2xl p-8 shadow-sm">
            <p className="text-sm font-medium text-blue-600 uppercase tracking-wide">Plano Profissional</p>
            <div className="mt-4 flex items-baseline justify-center gap-1">
              <span className="text-5xl font-bold text-slate-900">R$ 1.500</span>
              <span className="text-slate-500">/mês</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">Todos os módulos inclusos • Suporte prioritário</p>

            <ul className="mt-8 space-y-3 text-left max-w-sm mx-auto">
              {[
                "Ordens de serviço ilimitadas",
                "Estoque completo com custo médio",
                "WhatsApp + aprovação digital",
                "NF-e e NFS-e integradas",
                "Cronômetro e comissões",
                "Agendamento online",
                "Relatórios financeiros + PDF",
                "Usuários ilimitados",
                "Suporte via WhatsApp",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                  <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>

            <Link href="/register" className="mt-8 block w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700">
              Começar 15 dias grátis
            </Link>
            <p className="mt-3 text-xs text-slate-400">Sem cartão de crédito para o teste</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">© 2026 Operare. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <Link href="/login" className="hover:text-slate-700">Entrar</Link>
            <Link href="/register" className="hover:text-slate-700">Cadastrar</Link>
            <Link href="/planos" className="hover:text-slate-700">Planos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
