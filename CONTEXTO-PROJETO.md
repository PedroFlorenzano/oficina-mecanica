# Contexto do Projeto — Sistema Oficina Mecânica

## Resumo

Sistema SaaS de gestão para oficinas mecânicas automotivas brasileiras.
Piloto na **Paiffer Bosch Car Service Peugeot** (Sorocaba/SP), substituindo o sistema legado Syscar.
Objetivo final: atender inúmeras oficinas via assinatura mensal.

**Repositório:** https://github.com/PedroFlorenzano/oficina-mecanica
**Branch principal:** main
**Último commit:** 20/05/2026

---

## Stack Tecnológica

- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- **Backend:** API Routes do Next.js (thin controllers)
- **ORM:** Prisma 6
- **Banco:** SQLite (dev) — preparado para migrar para PostgreSQL (prod)
- **UI:** Design System próprio (src/components/ui/)
- **Arquitetura:** DDD (Domain-Driven Design) + Clean Architecture

---

## Arquitetura do Código

```
oficina/src/
├── domain/                    # Regras de negócio puras (sem deps de framework)
│   ├── errors/               # DomainError, ValidationError, NotFoundError, ConflictError
│   ├── value-objects/        # CPF, CNPJ, Document, Money, Plate, Email
│   └── repositories/        # Interfaces (contratos): IClientRepository, etc.
├── application/              # Casos de uso + DTOs
│   ├── dtos/                # CreateClientDTO, CreateOrderDTO, etc.
│   ├── errors/              # ApplicationError
│   └── use-cases/           # Organizados por módulo (clients/, vehicles/, orders/, stock/, services/)
├── infrastructure/           # Implementações concretas
│   ├── database/prisma.ts   # Singleton Prisma
│   ├── repositories/        # PrismaClientRepository, PrismaVehicleRepository, etc.
│   └── container.ts         # DI container simples
├── app/                      # Next.js App Router
│   ├── api/                 # API routes (thin controllers → chamam use cases)
│   └── dashboard/           # Páginas (clients, vehicles, orders, pista, stock, services)
├── components/
│   ├── Sidebar.tsx          # Navegação lateral
│   └── ui/                  # Design System (Button, Input, Select, Badge, Card, Modal, Table, etc.)
└── lib/
    ├── api-handler.ts       # Mapper de erro de domínio → HTTP response
    ├── prisma.ts            # Re-export para compatibilidade
    └── validators.ts        # Validação Zod (legacy, mantido)
```

---

## Módulos Implementados

| Módulo | Status | CRUD | Funcionalidades |
|--------|--------|------|-----------------|
| Clientes | ✅ | Criar, Editar, Buscar | Validação CPF/CNPJ, busca por placa |
| Veículos | ✅ | Criar, Editar, Excluir | Vinculado a cliente, validação placa única |
| Catálogo de Serviços | ✅ | Criar, Editar, Ativar/Desativar, Excluir | Preço padrão, tipo precificação (valor/tempo) |
| Estoque (Produtos) | ✅ | Criar, Editar, Excluir | Margem de lucro auto-calc, alerta estoque baixo |
| Ordens de Serviço | ✅ | Criar, Visualizar, Alterar Status | Estrutura de RECLAMAÇÕES agrupadas |
| Pista (Kanban) | ✅ | Visualizar | Cards visuais, filtro por mecânico/status |

---

## Estrutura da OS (Inovação vs Syscar)

A OS usa o conceito de **Reclamações do Cliente** (complaints):
- Cada OS tem N reclamações (ex: "Barulho na suspensão", "Troca de óleo")
- Dentro de cada reclamação ficam os Serviços e Peças relacionados
- Subtotal por reclamação + Total geral
- Campos do serviço: Descrição, Preço, Tempo de mão de obra (min)

---

## Design System (src/components/ui/)

Componentes prontos:
- `Button` — 5 variantes (primary, secondary, outline, ghost, danger), 3 tamanhos, loading
- `Input` — label, erro, hint, readonly
- `Select` — label, erro, chevron customizado
- `Badge` — 7 cores (default, success, warning, error, info, purple, orange)
- `Card` / `CardHeader` / `CardTitle` — com padding configurável
- `Modal` — 4 tamanhos, Escape, backdrop blur, scroll lock
- `Table` / `TableHeader` / `TableHead` / `TableBody` / `TableRow` / `TableCell`
- `PageHeader` — título + descrição + slot ação
- `EmptyState` — ícone + título + descrição + ação
- `Combobox` — Busca, seta ↑↓, Enter, Esc, scroll, close on blur

---

## Decisões de Negócio Tomadas

1. **WhatsApp** — fora do escopo agora (fase futura)
2. **Plataforma** — Web-first (responsivo desktop + tablet)
3. **Assinatura Digital** — Canvas HTML5 (evidência digital, não ICP-Brasil)
4. **Catálogo de Serviços** — Pré-cadastrado, mas permite criação inline na OS
5. **Múltiplos mecânicos por OS** — Suportado
6. **Billing/Inadimplência** — Recebido via webhook externo
7. **Multi-tenancy** — Dados isolados por tenant (DEMO_TENANT_ID = "demo-tenant")
8. **Comissões** — Calculadas sobre valor bruto, aprovação do admin antes do pagamento
9. **Estoque** — Saldo negativo bloqueado, custo médio ponderado
10. **NF-e/NFS-e** — Máx 3 retries automáticas, depois manual

---

## O que Falta Fazer (Próximos Passos)

### Prioridade Alta
- [ ] Migrar páginas existentes para usar os novos componentes do design system
- [ ] Autenticação real (NextAuth + login/senha)
- [ ] Gestão de Comissões
- [ ] Controle de movimentações de estoque (entrada/saída com rastreabilidade)

### Prioridade Média
- [ ] Emissão de NF-e/NFS-e (integração prefeitura + SEFAZ)
- [ ] Assinatura Digital do Cliente (canvas)
- [ ] Etiqueta de Troca de Óleo (impressão térmica)
- [ ] Cronômetro de Serviço (server-side)
- [ ] Relatórios (comissões, estoque, faturamento)
- [ ] Dashboard com dados reais (contadores dinâmicos)

### Prioridade Baixa
- [ ] Integração WhatsApp (fase futura)
- [ ] Exportar Excel na Pista
- [ ] Testes unitários (value objects, use cases)
- [ ] Testes de integração (API routes)
- [ ] Deploy (PostgreSQL + Vercel ou AWS)
- [ ] CI/CD pipeline

---

## Como Rodar

```bash
cd oficina
npm install
npx prisma migrate dev
npx tsx prisma/seed.ts
npm run dev
# http://localhost:3000
```

## Dados de Demo (seed)

- Tenant: Paiffer Bosch Car Service (id: demo-tenant)
- Admin: admin@paiffer.com / password123
- Mecânico: mecanico@paiffer.com / password123
- Clientes: Carlos Silva (CPF), Maria Oliveira (CPF)
- Veículos: Peugeot 208 (ABC1D23), Peugeot 3008 (XYZ9K87)
- 5 serviços no catálogo, 4 itens de estoque

---

## Referência do Sistema Legado (Syscar)

- OS impressa com: Cabeçalho oficina, Cliente completo, Veículo (KM-E/KM-S), Problemas/Avarias, Produtos (Cód/Marca/Qtd/Und/Desc/Unit/Total), Serviços (Cód/Qtd tempo/Desc/Unit/Total), Totais separados (Produtos + Serviços + Geral), Observações da oficina, Assinatura digital
- Pista: Cards Kanban com nº OS, status colorido, modelo+placa, cliente, mecânico, data, total
- Cadastro Produto: Código, Descrição, Aplicação, Localização, SKU, Barras, Marca, Unidade, Grupo, Observações, NCM, CEST, Estoque, Custo/Margem/Venda

---

*Arquivo gerado em 20/05/2026 para continuidade do desenvolvimento.*
