# Contexto do Projeto — Sistema Oficina Mecânica

## Resumo

Sistema SaaS de gestão para oficinas mecânicas automotivas brasileiras.
Piloto na **Paiffer Bosch Car Service Peugeot** (Sorocaba/SP), substituindo o sistema legado Syscar.
Objetivo final: atender inúmeras oficinas via assinatura mensal.

**Repositório:** https://github.com/PedroFlorenzano/oficina-mecanica
**Branch principal:** main
**Branch de desenvolvimento atual:** feature/autenticacao-perfis
**Última atualização:** 21/05/2026

---

## Stack Tecnológica

- **Frontend:** Next.js 16 (App Router) + TypeScript 5 + Tailwind CSS 4
- **Backend:** API Routes do Next.js (thin controllers)
- **ORM:** Prisma 6
- **Banco:** SQLite (dev) — preparado para migrar para PostgreSQL (prod)
- **Auth:** NextAuth v4 + CredentialsProvider + JWT sessions
- **Hash de senhas:** bcryptjs (salt rounds: 10)
- **PDF:** @react-pdf/renderer (server-side)
- **UI:** Design System próprio (src/components/ui/)
- **Arquitetura:** DDD (Domain-Driven Design) + Clean Architecture

---

## Arquitetura do Código

```
oficina/src/
├── types/
│   └── next-auth.d.ts        # Module augmentation: userId, tenantId, role na Session e JWT
├── domain/                    # Regras de negócio puras (sem deps de framework)
│   ├── errors/               # DomainError, ValidationError, NotFoundError, ConflictError,
│   │                         # BusinessRuleError, AuthenticationError, ForbiddenError
│   ├── value-objects/        # CPF, CNPJ, Document, Money, Plate, Email, PasswordValidator,
│   │                         # OrderStatusTransitions
│   └── repositories/        # Interfaces: IClientRepository, IVehicleRepository,
│                             # IServiceOrderRepository, IStockItemRepository,
│                             # IStockMovementRepository, IUserRepository,
│                             # IServiceCatalogRepository, ITimerLogRepository
├── application/              # Casos de uso + DTOs
│   ├── dtos/                # CreateClientDTO, CreateOrderDTO, CreateVehicleDTO,
│   │                         # CreateStockItemDTO, CreateServiceDTO, RegisterStockEntryDTO,
│   │                         # AdjustInventoryDTO, CreateUserDTO, UpdateUserDTO, ChangePasswordDTO,
│   │                         # StartTimerDTO, PauseTimerDTO, ResumeTimerDTO, FinishTimerDTO, CorrectTimerDTO
│   ├── errors/              # ApplicationError
│   └── use-cases/           # Organizados por módulo:
│       ├── clients/         # CreateClient, UpdateClient, SearchClients, DeleteClient,
│       │                     # ActivateClient, GetClientHistory
│       ├── vehicles/        # CreateVehicle, UpdateVehicle, DeleteVehicle,
│       │                     # GetVehicleHistory, CheckOilChangeReminder
│       ├── orders/          # CreateOrder, UpdateOrderStatus, UpdatePistaStatus,
│       │                     # GetPista, CancelOrder, GenerateOrderPDF
│       ├── stock/           # CreateStockItem, UpdateStockItem, DeleteStockItem,
│       │                     # ReserveStock, ConfirmStockConsumption, ReverseStockReservations,
│       │                     # RegisterStockEntry, AdjustInventory, GetLowStockAlerts
│       ├── services/        # CreateService, UpdateService, DeleteService
│       └── users/           # LoginUser, CreateUser, UpdateUser, DeactivateUser,
│                             # ActivateUser, ChangePassword
│       └── timer/           # StartTimer, PauseTimer, ResumeTimer, FinishTimer,
│                             # CorrectTimer, GetTimersByService, GetTimersByOrder
├── infrastructure/           # Implementações concretas
│   ├── database/prisma.ts   # Singleton Prisma
│   ├── repositories/        # PrismaClientRepository, PrismaVehicleRepository,
│   │                         # PrismaServiceOrderRepository, PrismaStockItemRepository,
│   │                         # PrismaStockMovementRepository, PrismaUserRepository,
│   │                         # PrismaServiceCatalogRepository, PrismaTimerLogRepository
│   └── container.ts         # DI container (clientRepository, vehicleRepository,
│                             # orderRepository, stockItemRepository, stockMovementRepository,
│                             # userRepository, serviceCatalogRepository, timerLogRepository)
├── middleware.ts              # withAuth — protege /dashboard/* e /api/* (exceto /api/auth/*)
├── app/                      # Next.js App Router
│   ├── api/
│   │   ├── auth/[...nextauth]/  # NextAuth handler + authOptions exportado
│   │   ├── clients/         # GET, POST, [id]/GET/PUT/PATCH/DELETE, [id]/history
│   │   ├── vehicles/        # GET, POST, [id]/GET/PUT/DELETE, [id]/history, [id]/oil-reminder
│   │   ├── orders/          # GET, POST, [id]/GET/PATCH, [id]/pdf, pista/GET/PATCH,
│   │   │                     # [id]/timers/GET (GetTimersByOrder)
│   │   ├── order-services/  # [id]/timers/GET (GetTimersByService)
│   │   ├── timer-logs/      # POST (StartTimer), [id]/pause/PATCH, [id]/resume/POST,
│   │   │                     # [id]/finish/PATCH, [id]/PATCH (CorrectTimer - ADMIN)
│   │   ├── dashboard/       # summary/GET (cards + últimas OS)
│   │   ├── stock/           # GET, POST, [id]/GET/PUT/DELETE, [id]/entry, [id]/adjust,
│   │   │                     # [id]/movements, alerts
│   │   ├── services/        # GET, POST, [id]/PUT/DELETE
│   │   └── users/           # GET, POST, [id]/PUT/PATCH, me/password/PATCH,
│   │                         # [id]/productivity/GET (histórico do mecânico - ADMIN)
│   ├── login/               # Tela de login (Server Component + LoginForm client)
│   └── dashboard/
│       ├── layout.tsx       # Server Component com getServerSession, header autenticado
│       ├── clients/         # Listagem, form, [id]/history
│       ├── vehicles/        # Listagem, form, [id]/history
│       ├── orders/          # Listagem, new/, [id]/
│       ├── pista/           # Kanban com drag-and-drop
│       ├── stock/           # Listagem, form, [id]/ (detalhe + histórico de movimentos)
│       ├── services/        # Listagem, form
│       ├── users/           # CRUD de usuários (só ADMIN), [id]/ produtividade mecânico
│       └── profile/         # Troca de senha do usuário logado
├── components/
│   ├── Sidebar.tsx          # Navegação condicional por role (prop `role`)
│   ├── LoginForm.tsx        # Formulário de login (client component)
│   ├── LogoutButton.tsx     # Botão de logout com signOut
│   ├── pdf/OSDocument.tsx   # Template PDF da OS com @react-pdf/renderer
│   ├── timer/
│   │   └── TimerControl.tsx # Componente client-side de cronômetro (ticker, modal pausa,
│   │                         # correção admin inline HH:MM:SS, histórico por sessão)
│   └── ui/                  # Design System
└── lib/
    ├── api-handler.ts       # Mapper DomainError → HTTP (inclui 401/403)
    ├── auth.ts              # authOptions + requireAuth() helper
    ├── permissions.ts       # hasPermission(role, resource, permission) — matriz RBAC
    ├── prisma.ts            # Re-export para compatibilidade
    └── validators.ts        # Zod legacy
```

---

## Módulos Implementados

| # | Módulo | Status | O que está pronto |
|---|--------|--------|-------------------|
| 1 | Gestão de Clientes e Veículos | ✅ 100% | CRUD completo, soft-delete + reativação, histórico de OS por cliente/veículo, lembrete de troca de óleo (toggle por veículo), busca por placa |
| 2 | Autenticação e Perfis de Acesso | ✅ 100% | Login/logout, NextAuth JWT, middleware de proteção, bloqueio após 5 tentativas, 3 roles (ADMIN/ATTENDANT/MECHANIC), gerenciamento de usuários, troca de senha |
| 3 | Multi-Tenancy | 🟡 20% | tenantId em todos os dados, estrutura pronta — isolamento real depende de PostgreSQL em produção |
| 4 | Ordem de Serviço (OS) | ✅ 100% | Criação com Reclamações, status padrão WAITING_APPROVAL, cancelamento com motivo, PDF completo, integração estoque (reserva/consumo/reversão), Kanban Pista |
| 5 | Controle de Estoque | ✅ 100% | CRUD itens, entrada com custo médio ponderado, histórico paginado de movimentos, alertas de mínimo (badge Sidebar + painel), ajuste físico (ADJUSTMENT), log imutável |
| 6 | Emissão de NF-e/NFS-e | ❌ 0% | Não iniciado |
| 7 | Integração WhatsApp | ❌ 0% | Não iniciado (TODOs marcados nos pontos de integração) |
| 8 | Assinatura Digital | ❌ 0% | Não iniciado |
| 9 | Gestão de Comissões | ❌ 0% | Não iniciado |
| 10 | Etiqueta de Troca de Óleo | ❌ 0% | Não iniciado |
| 11 | Cronômetro de Serviço | ✅ 100% | Model TimerLog + TimerAuditLog, use cases completos, property-based tests, API routes, componente TimerControl na tela de OS |

---

## Schema Prisma — Estado Atual

### Modelos e campos relevantes

```
Tenant: id, name, cnpj, logo, phone, address, active
User: id, email, password (bcrypt), name, role (ADMIN/MECHANIC/ATTENDANT),
      active, tenantId, failedLoginCount (Int @default(0)), lockedUntil (DateTime?)
Client: id, name, document, docType (CPF/CNPJ), phone, email, address, active (bool), tenantId
Vehicle: id, plate, brand, model, year, yearModel, color, fuel, chassis, mileage,
         oilReminderEnabled (bool @default(true)), clientId, tenantId
ServiceOrder: id, number, status (OPEN→WAITING_APPROVAL→...→DELIVERED/CANCELLED),
              mileage, notes, cancelReason (String?), totalAmount, clientId, vehicleId,
              tenantId, createdById
Complaint: id, number, description, orderId
OrderService: id, description, price, timeMinutes (Int?), serviceId, orderId,
              complaintId, mechanicId
OrderPart: id, description, quantity, unitPrice, totalPrice, stockItemId, orderId,
           complaintId, used (bool)
StockItem: id, code, barcode, description, brand, unit, minQuantity, quantity,
           location, costPrice, sellPrice, avgCost, profitMargin, active, tenantId
StockMovement: id, type (IN/OUT/RESERVED/CONSUMPTION/REVERSAL/ADJUSTMENT),
               quantity, reason, document, orderId, balanceBefore, balanceAfter,
               stockItemId, createdAt  ← IMUTÁVEL (sem update/delete)
StatusHistory: id, fromStatus, toStatus, userId, orderId
TimerLog: id, startedAt, pausedAt, finishedAt, pauseReason, totalSeconds,
          orderServiceId, userId, auditLogs TimerAuditLog[]
TimerAuditLog: id, timerLogId, adminUserId, previousTotalSeconds, newTotalSeconds, changedAt
ServiceCatalog: id, code, description, category, estimatedTime, defaultPrice, pricingType, active
```

### Enums
- `Role`: ADMIN, MECHANIC, ATTENDANT
- `DocType`: CPF, CNPJ
- `OrderStatus`: OPEN, IN_PROGRESS, WAITING_PART, WAITING_APPROVAL, COMPLETED, DELIVERED, CANCELLED
- `MovementType`: IN, OUT, RESERVED, CONSUMPTION, REVERSAL, ADJUSTMENT

---

## Autenticação — Como Funciona

```
Fluxo: /login → LoginForm → signIn("credentials") → NextAuth → LoginUser use case
       → bcrypt.compare → JWT { userId, tenantId, role } → cookie → middleware valida
```

- **Sessão:** JWT (não database), maxAge 24h, `NEXTAUTH_SECRET` em `.env`
- **requireAuth():** em `src/lib/auth.ts` — todas as API routes chamam isso no topo
- **Bloqueio:** 5 tentativas falhas → lockedUntil = agora + 15min
- **Roles e o que cada um acessa:**
  - `ADMIN` — tudo, incluindo `/dashboard/users`
  - `ATTENDANT` — clientes, veículos, OS, estoque (r), fiscal, WhatsApp, etiquetas
  - `MECHANIC` — OS (r), estoque (r), cronômetros (r/w), etiquetas (r/w)

---

## Fluxo de Estoque na OS

```
Adicionar peça à OS  → ReserveStock      (MovementType.RESERVED, saldo -= qty)
Concluir OS          → ConfirmStockConsumption (CONSUMPTION p/ used=true, REVERSAL p/ used=false)
Cancelar OS          → ReverseStockReservations (REVERSAL, saldo += qty)
Ajuste físico        → AdjustInventory   (ADJUSTMENT, saldo = newQuantity)
Entrada de estoque   → RegisterStockEntry (IN, recalcula avgCost = CMP)
```

**Fórmula CMP:** `novo = (saldo × avgCostAtual + qtd × unitCost) / (saldo + qtd)`

---

## Estrutura da OS (Inovação vs Syscar)

A OS usa o conceito de **Reclamações do Cliente** (complaints):
- Cada OS tem N reclamações (ex: "Barulho na suspensão", "Troca de óleo")
- Dentro de cada reclamação ficam os Serviços e Peças relacionados
- Subtotal por reclamação + Total geral
- **Status padrão de criação:** `WAITING_APPROVAL` (cliente precisa aprovar o orçamento)

**Fluxo de status:** OPEN → IN_PROGRESS → WAITING_PART | WAITING_APPROVAL → COMPLETED → DELIVERED (ou CANCELLED)

---

## Design System (src/components/ui/)

Componentes prontos:
- `Button` — 5 variantes (primary, secondary, outline, ghost, danger), 3 tamanhos, loading
- `Input` — label, erro, hint, readonly, suporta `type="password"`
- `Select` — label, erro, chevron customizado
- `Badge` — 7 cores (default, success, warning, error, info, purple, orange)
- `Card` / `CardHeader` / `CardTitle`
- `Modal` — 4 tamanhos (sm, md, lg, xl), Escape, backdrop, scroll lock
- `Table` / `TableHeader` / `TableHead` / `TableBody` / `TableRow` / `TableCell`
- `PageHeader` — título + descrição + slot ação
- `EmptyState` — ícone + título + descrição + ação
- `Combobox` — busca, navegação por teclado, close on blur

---

## Decisões de Negócio Tomadas

1. **WhatsApp** — fora do escopo agora; TODOs marcados (`// TODO: integrar com alertas de WhatsApp`)
2. **Lembrete de manutenção preventiva** — o sistema registra a última troca de óleo/revisão; quando passar 6 meses ou +10.000 km, o futuro módulo de WhatsApp disparará mensagem automática. Toggle por veículo (`oilReminderEnabled`).
3. **Plataforma** — Web-first (responsivo desktop + tablet)
4. **Assinatura Digital** — Canvas HTML5 (evidência digital, não ICP-Brasil)
5. **Catálogo de Serviços** — Pré-cadastrado, permite criação inline na OS
6. **Múltiplos mecânicos por OS** — Suportado (por serviço via `mechanicId`)
7. **Billing/Inadimplência** — Recebido via webhook externo
8. **Multi-tenancy** — Dados isolados por `tenantId`; em dev usa `demo-tenant`; isolamento real com schema por tenant no PostgreSQL (produção)
9. **Comissões** — Calculadas sobre valor bruto, aprovação do admin antes do pagamento
10. **Estoque** — Saldo negativo bloqueado, custo médio ponderado, log imutável (sem UPDATE/DELETE em StockMovement)
11. **NF-e/NFS-e** — Máx 3 retries automáticas via BullMQ, depois notificação ao admin
12. **Senha** — Mínimo 8 chars, maiúscula, minúscula, dígito (validado em PasswordValidator + frontend)
13. **Status padrão da OS** — `WAITING_APPROVAL` (cliente aprova antes de executar)

---

## Próximos Módulos (sequência recomendada)

| Ordem | Módulo | Dependências |
|-------|--------|-------------|
| 1 | ✅ Estoque completo | — |
| 2 | ✅ Autenticação | — |
| 3 | Cronômetro de Serviço | Auth (vincular ao mecânico logado) |
| 4 | Gestão de Comissões | Auth + Cronômetro |
| 5 | Assinatura Digital | — (independente) |
| 6 | Etiqueta de Troca de Óleo | — (independente, ZPL/Zebra) |
| 7 | NF-e/NFS-e + WhatsApp + lembrete preventivo | Auth, BullMQ/Redis |

---

## Como Rodar

```bash
cd oficina
npm install
npx prisma migrate dev
npx prisma generate
npm run dev
# http://localhost:3000
```

## Dados de Demo (seed + demo-seed)

- **Tenant:** Paiffer Bosch Car Service (id: `demo-tenant`)
- **Admin:** `admin@paiffer.com` / `password123` (role: ADMIN)
- **Mecânico:** `mecanico@paiffer.com` / `password123` (role: MECHANIC)
- **Clientes:** 6 (incluindo 1 inativo — "Auto Peças Ltda" para testar reativação)
- **Veículos:** 6 (incluindo 1 com lembrete de óleo desligado — Toyota Corolla JKL4G56)
- **Ordens de Serviço:** 10 com todos os status (WAITING_APPROVAL, IN_PROGRESS, WAITING_PART, COMPLETED, DELIVERED, CANCELLED)
- **Estoque:** 8 itens (3 abaixo do mínimo para testar alertas)
- **Movimentações:** 17 registros (IN, OUT, ADJUSTMENT)

Para recriar dados demo após reset:
```bash
npx tsx prisma/seed.ts
```

---

## Referência do Sistema Legado (Syscar)

- OS impressa com: Cabeçalho oficina, Cliente completo, Veículo (KM-E/KM-S), Problemas/Avarias, Produtos (Cód/Marca/Qtd/Und/Desc/Unit/Total), Serviços (Cód/Qtd tempo/Desc/Unit/Total), Totais separados (Produtos + Serviços + Geral), Observações da oficina, Assinatura digital
- Pista: Cards Kanban com nº OS, status colorido, modelo+placa, cliente, mecânico, data, total
- Cadastro Produto: Código, Descrição, Aplicação, Localização, SKU, Barras, Marca, Unidade, Grupo, Observações, NCM, CEST, Estoque, Custo/Margem/Venda

---

*Última atualização: 22/05/2026 — Módulo 11 (Cronômetro de Serviço) implementado. Dashboard renovado com dados reais e cards clicáveis. Tela de produtividade por mecânico adicionada.*

---

## Módulo 11 — Cronômetro de Serviço (implementado em 22/05/2026)

### O que foi construído

Rastreamento de tempo efetivo por mecânico em cada `OrderService` de uma OS. Múltiplas sessões de pausa/retomada por serviço, com cálculo de tempo líquido, atualização automática de `OrderService.timeMinutes` e log de auditoria para correções administrativas.

### Schema adicionado

```prisma
// Relação adicionada ao TimerLog existente:
model TimerLog {
  auditLogs  TimerAuditLog[]
}

// Novo model:
model TimerAuditLog {
  id                   String   @id @default(cuid())
  timerLogId           String
  adminUserId          String
  previousTotalSeconds Int
  newTotalSeconds      Int
  changedAt            DateTime @default(now())
  timerLog  TimerLog @relation(...)
}
```

### Estados do TimerLog

```
[*] → Ativa (start) → Pausada (pause) → Ativa (resume, cria novo TimerLog)
Ativa → Finalizada (finish)
Finalizada → Finalizada (admin correction, atualiza totalSeconds + auditoria)
```

- **Sessão Ativa:** `finishedAt IS NULL AND pausedAt IS NULL`
- **Sessão Pausada:** `pausedAt IS NOT NULL AND finishedAt IS NULL`
- **Sessão Finalizada:** `finishedAt IS NOT NULL`
- **Tempo líquido:** soma de `totalSeconds` das sessões finalizadas do serviço
- **Resume cria novo TimerLog** — o pausado fica consolidado com `totalSeconds` calculado

### Cálculo de tempo

- **Pausa:** `totalSeconds = floor((pausedAt - startedAt) / 1000)`
- **Finalização ativa:** `totalSeconds = timerLog.totalSeconds + floor((finishedAt - startedAt) / 1000)`
- **Finalização pausada:** `totalSeconds = timerLog.totalSeconds` (já calculado ao pausar)
- **timeMinutes:** `floor(sum(totalSeconds de sessões finalizadas) / 60)` gravado em `OrderService.timeMinutes`

### API Routes

| Rota | Método | Ação | Role |
|------|--------|------|------|
| `/api/timer-logs` | POST | StartTimer | MECHANIC |
| `/api/timer-logs/[id]/pause` | PATCH | PauseTimer | MECHANIC |
| `/api/timer-logs/[id]/resume` | POST | ResumeTimer | MECHANIC |
| `/api/timer-logs/[id]/finish` | PATCH | FinishTimer | MECHANIC |
| `/api/timer-logs/[id]` | PATCH | CorrectTimer | ADMIN |
| `/api/order-services/[id]/timers` | GET | GetTimersByService | todos |
| `/api/orders/[id]/timers` | GET | GetTimersByOrder | todos |

### Isolamento multi-tenant

`TimerLog` não tem `tenantId`. Isolamento via join: `TimerLog → OrderService → ServiceOrder.tenantId`. Método `findByIdForTenant(id, tenantId)` no repositório faz esse join automaticamente.

### Componente TimerControl

`src/components/timer/TimerControl.tsx` — client component integrado à tela `/dashboard/orders/[id]`:

- Busca estado via `GET /api/order-services/[id]/timers` ao montar
- Ticker `setInterval` (1s) incrementa display enquanto status é "ativa"
- `displaySeconds` = `netSeconds + elapsed atual` (ativa) | `netSeconds + pausedLog.totalSeconds` (pausada)
- **MECHANIC:** botões Iniciar / Pausar+Finalizar (ativo) / Retomar+Finalizar (pausado)
- **Pausa:** modal com campo de texto 3–255 chars, botão Confirmar desabilitado abaixo do mínimo
- **ADMIN/ATTENDANT:** somente visualização — sem botões de controle
- **Erro:** exibe mensagem + botão "Atualizar estado" (re-fetch sem esconder botões permanentemente)
- **Correção admin:** botão ✏️ em sessões finalizadas abre input HH:MM:SS inline
- Histório de sessões colapsável com início, fim/pausa, motivo e duração

### Testes

- **86 testes unitários** — guards, fluxo feliz, cenários de erro (StartTimer, PauseTimer, ResumeTimer, FinishTimer, CorrectTimer, GetTimersByService, GetTimersByOrder)
- **7 propriedades fast-check (100 runs cada):**
  - Property 1: `totalSeconds >= 0` para toda sessão finalizada
  - Property 2+8: `timeMinutes = floor(sum / 60)`
  - Property 3: cálculo sem pausas = `floor(delta / 1000)`
  - Property 4: soma de intervalos de pausa/retomada = `totalSeconds` acumulado
  - Property 5: unicidade de sessão ativa por `(orderServiceId, userId)`
  - Property 6: `pauseReason` armazenado igual ao informado (trim)
  - Property 7: `newTotalSeconds` fora de `[0, 86400]` rejeita com `ValidationError`
- **9 testes de componente** React Testing Library (TimerControl)

---

## Tela de Produtividade por Mecânico (implementado em 22/05/2026)

**Acesso:** `ADMIN` → Usuários → ícone 📊 em qualquer não-ADMIN → `/dashboard/users/[id]`

**API:** `GET /api/users/[id]/productivity` — retorna user + lista de serviços com apontamento

**O que exibe:**
- Cards de resumo: serviços com apontamento, tempo total apontado, tempo total estimado
- Tabela: OS# (link clicável), cliente, veículo/placa, nome do serviço, status da OS, tempo estimado, tempo apontado
- Código de cores no tempo apontado: verde (≤ estimado), amarelo (até 20% acima), vermelho (acima de 20%)

**Obs:** conta apenas sessões com `finishedAt IS NOT NULL`.

---

## Dashboard (renovado em 22/05/2026)

- Reescrito de server component estático para client component com fetch real
- Cards clicáveis com `Link` para o módulo correspondente + seta + hover animado
- Skeleton de loading animado enquanto dados carregam
- Dados reais via `GET /api/dashboard/summary`: conta clientes ativos, veículos, OS em aberto (não terminais), itens de estoque ativos
- Tabela das últimas 8 OS com: número, cliente, veículo+placa, status colorido, total R$, data, link "Abrir →"
