import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

const features = [
  { title: "Ordens de Serviço", desc: "Reclamações do cliente, serviços, peças, PDF do orçamento e aprovação digital via WhatsApp." },
  { title: "Controle de Estoque", desc: "Custo médio ponderado, alertas de mínimo, fornecedor e histórico imutável de movimentações." },
  { title: "WhatsApp Integrado", desc: "Envio de orçamento, aprovação digital pelo cliente, lembretes preventivos e pós-venda." },
  { title: "Pista (Kanban)", desc: "Acompanhe as OS em tempo real com drag-and-drop por status e mecânico responsável." },
  { title: "Comissões", desc: "Cálculo automático por mecânico, aprovação pelo admin, histórico e relatórios detalhados." },
  { title: "NF-e / NFS-e", desc: "Emissão direta pela SEFAZ e prefeitura. DANFE e XML gerados com um clique." },
  { title: "Cronômetro de Serviço", desc: "Tempo real por mecânico em cada serviço. Controle de produtividade e eficiência." },
  { title: "Agendamento Online", desc: "Link público para o cliente agendar horário. Configurável por dia da semana." },
  { title: "Relatórios Financeiros", desc: "Faturamento, ticket médio, peças mais usadas, produtividade. Tudo em gráficos claros." },
];

const steps = [
  { num: "1", title: "Cadastre sua oficina", desc: "Em 2 minutos. Sem cartão de crédito, sem burocracia." },
  { num: "2", title: "Configure seus serviços", desc: "Importe do sistema anterior ou cadastre do zero. Peças, preços, mecânicos." },
  { num: "3", title: "Comece a usar", desc: "Abra a primeira OS e veja tudo funcionando. Suporte via WhatsApp se precisar de ajuda." },
];

const faqs = [
  { q: "Preciso instalar algo no computador?", a: "Não. O Operare funciona 100% no navegador. Acesse de qualquer dispositivo — computador, tablet ou celular." },
  { q: "Posso importar dados do meu sistema atual?", a: "Sim. Fazemos a migração gratuita de sistemas como Syscar, Odin, Ultracar e planilhas Excel." },
  { q: "E se eu não gostar?", a: "Você tem 15 dias grátis para testar tudo. Se não for para você, é só não renovar. Sem multa, sem fidelidade." },
  { q: "Como funciona o suporte?", a: "Suporte direto via WhatsApp com o desenvolvedor. Sem fila, sem robô. Resposta em minutos." },
  { q: "O sistema emite nota fiscal?", a: "Sim. NF-e (produtos) via SEFAZ e NFS-e (serviços) via prefeitura. Tudo integrado à OS." },
  { q: "Quantos usuários posso ter?", a: "Ilimitados. Cada mecânico, recepcionista e gerente tem seu próprio login com permissões configuráveis." },
];

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur-sm z-50">
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
            <Link href="#como-funciona" className="hidden sm:inline text-sm text-slate-600 hover:text-slate-900 font-medium">Como funciona</Link>
            <Link href="#funcionalidades" className="hidden sm:inline text-sm text-slate-600 hover:text-slate-900 font-medium">Funcionalidades</Link>
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 font-medium">Entrar</Link>
            <Link href="/register" className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">
              Começar Grátis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-6">
          ✨ 15 dias grátis — sem cartão de crédito
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight max-w-4xl mx-auto">
          Sua oficina organizada como nunca foi
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
          Da recepção à entrega: OS, estoque, financeiro, NF-e, WhatsApp e comissões.
          Tudo num sistema feito por quem entende oficina brasileira.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register" className="w-full sm:w-auto bg-blue-600 text-white px-8 py-3.5 rounded-lg text-base font-semibold hover:bg-blue-700 shadow-sm">
            Testar grátis por 15 dias
          </Link>
          <Link href="#como-funciona" className="w-full sm:w-auto border border-slate-300 text-slate-700 px-8 py-3.5 rounded-lg text-base font-medium hover:bg-slate-50">
            Como funciona →
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-400">Migração gratuita do seu sistema atual</p>
      </section>

      {/* Social proof */}
      <section className="border-y border-slate-100 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm text-slate-500 mb-4">Feito para oficinas como a sua</p>
          <div className="flex flex-wrap justify-center gap-8 items-center text-slate-400">
            <span className="text-lg font-semibold text-slate-700">Bosch Car Service</span>
            <span className="text-sm text-slate-400">•</span>
            <span className="text-lg font-semibold text-slate-700">Oficinas multimarcas</span>
            <span className="text-sm text-slate-400">•</span>
            <span className="text-lg font-semibold text-slate-700">Centros automotivos</span>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">Comece em 3 passos</h2>
          <p className="text-center text-slate-600 mb-12">Sem instalação, sem contrato, sem dor de cabeça.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.num} className="text-center">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">{s.num}</div>
                <h3 className="font-semibold text-slate-900 text-lg mb-2">{s.title}</h3>
                <p className="text-slate-600 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="funcionalidades" className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">Tudo que sua oficina precisa</h2>
          <p className="text-center text-slate-600 mb-12">Um sistema completo, sem precisar de vários programas diferentes.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Depoimento */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <blockquote className="text-xl sm:text-2xl text-slate-700 italic leading-relaxed">
            &ldquo;Saímos do Syscar para o Operare e em uma semana já estava tudo funcionando.
            A emissão de nota que demorava 10 minutos agora é um clique.&rdquo;
          </blockquote>
          <p className="mt-4 text-sm text-slate-500 font-medium">— Oficina piloto, Sorocaba/SP</p>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Simples e transparente</h2>
          <p className="text-slate-600 mb-10">Um plano completo com tudo incluso. Sem surpresas na fatura.</p>

          <div className="bg-white border-2 border-blue-600 rounded-2xl p-8 shadow-sm">
            <p className="text-sm font-medium text-blue-600 uppercase tracking-wide">Plano Profissional</p>
            <div className="mt-4 flex items-baseline justify-center gap-1">
              <span className="text-5xl font-bold text-slate-900">R$ 1.500</span>
              <span className="text-slate-500">/mês</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">Todos os módulos • Usuários ilimitados • Suporte direto</p>

            <ul className="mt-8 space-y-3 text-left max-w-sm mx-auto">
              {[
                "Ordens de serviço ilimitadas",
                "Estoque completo com custo médio",
                "WhatsApp + aprovação digital",
                "NF-e e NFS-e integradas",
                "Cronômetro e comissões",
                "Agendamento online",
                "Relatórios financeiros + PDF",
                "Usuários e mecânicos ilimitados",
                "Suporte via WhatsApp",
                "Migração gratuita do sistema anterior",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                  <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>

            <Link href="/register" className="mt-8 block w-full bg-blue-600 text-white py-3.5 rounded-lg font-semibold hover:bg-blue-700 text-base">
              Começar 15 dias grátis
            </Link>
            <p className="mt-3 text-xs text-slate-400">Sem cartão de crédito • Cancele quando quiser</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Perguntas frequentes</h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="border-b border-slate-100 pb-6">
                <h3 className="font-semibold text-slate-900 mb-2">{faq.q}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-blue-600 py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Pronto para organizar sua oficina?</h2>
          <p className="text-blue-100 mb-8">Comece agora e veja resultados na primeira semana. Sem risco.</p>
          <Link href="/register" className="inline-block bg-white text-blue-600 px-8 py-3.5 rounded-lg text-base font-semibold hover:bg-blue-50">
            Começar 15 dias grátis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">© 2026 Operare. Todos os direitos reservados.</p>
            <p className="text-xs text-slate-400 mt-1">DF Developer — Sorocaba/SP</p>
          </div>
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
