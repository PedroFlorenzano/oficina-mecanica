import Link from "next/link";

export default function PlanosPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-slate-900">Operare</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 font-medium">Entrar</Link>
            <Link href="/register" className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">Começar Grátis</Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-900">Escolha seu plano</h1>
          <p className="mt-3 text-slate-600">Comece grátis por 15 dias. Sem cartão de crédito.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Trial */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Teste Gratuito</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-slate-900">R$ 0</span>
              <span className="text-slate-500">/15 dias</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">Acesso completo para conhecer o sistema</p>

            <ul className="mt-6 space-y-2">
              {[
                "Todos os módulos disponíveis",
                "Até 50 ordens de serviço",
                "2 usuários inclusos",
                "Suporte por e-mail",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                  <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>

            <Link href="/register" className="mt-8 block w-full text-center border border-blue-600 text-blue-600 py-3 rounded-lg font-semibold hover:bg-blue-50">
              Criar conta grátis
            </Link>
          </div>

          {/* Profissional */}
          <div className="bg-white rounded-2xl border-2 border-blue-600 p-8 relative shadow-sm">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              RECOMENDADO
            </div>
            <p className="text-sm font-medium text-blue-600 uppercase tracking-wide">Profissional</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-slate-900">R$ 1.500</span>
              <span className="text-slate-500">/mês</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">Tudo incluso, sem limites</p>

            <ul className="mt-6 space-y-2">
              {[
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
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                  <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>

            <Link href="/register" className="mt-8 block w-full text-center bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700">
              Começar 15 dias grátis
            </Link>
            <p className="mt-2 text-xs text-slate-400 text-center">Após o teste, R$ 1.500/mês</p>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-slate-900 text-center mb-8">Perguntas frequentes</h2>
          <div className="space-y-4">
            {[
              { q: "Preciso de cartão de crédito para testar?", a: "Não. O teste de 15 dias é gratuito e sem compromisso." },
              { q: "Posso cancelar a qualquer momento?", a: "Sim. Sem multa, sem fidelidade. Seus dados ficam disponíveis por 30 dias após o cancelamento." },
              { q: "O sistema funciona no celular?", a: "Sim. O sistema é responsivo e funciona em desktop, tablet e celular." },
              { q: "Quantos usuários posso ter?", a: "No plano Profissional, ilimitados. Crie quantos mecânicos, atendentes e admins precisar." },
              { q: "Meus dados ficam seguros?", a: "Sim. Dados isolados por oficina com Row-Level Security no banco. Cada oficina só vê seus próprios dados." },
            ].map((faq) => (
              <div key={faq.q} className="bg-white rounded-lg border p-4">
                <p className="font-medium text-slate-900 text-sm">{faq.q}</p>
                <p className="text-sm text-slate-600 mt-1">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 bg-white">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-slate-500">
          © 2026 Operare. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
